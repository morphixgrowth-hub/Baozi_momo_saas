import express, { Request, Response } from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Server-side Gemini initialization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (e) {
      console.error('Error initializing GoogleGenAI:', e);
    }
  }
  return aiClient;
}

// In-Memory Data Store for Restaurant SaaS
interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

type OrderStatus = 'ORDERING' | 'PREPARING' | 'SERVED' | 'SETTLED';

interface TableOrder {
  id: string;
  table_no: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  upiPaymentLink?: string;
  createdAt: string;
  updatedAt: string;
  settledAt?: string;
  rawJson?: string;
}

// Default state of active tables
let tableOrders: { [tableNo: string]: TableOrder } = {
  'Table 2': {
    id: 'ORD-201',
    table_no: 'Table 2',
    status: 'SETTLED',
    items: [
      { name: 'Classic Steamed Veg Momos', qty: 2, price: 120 },
      { name: 'Fresh Lime Soda', qty: 1, price: 90 },
    ],
    subtotal: 330,
    gstAmount: 16.5,
    grandTotal: 346.5,
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    settledAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  'Table 3': {
    id: 'ORD-301',
    table_no: 'Table 3',
    status: 'PREPARING',
    items: [
      { name: 'Chicken Tikka Baozi', qty: 2, price: 180 },
      { name: 'Fresh Lime Soda', qty: 2, price: 90 },
    ],
    subtotal: 540,
    gstAmount: 27,
    grandTotal: 567,
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    rawJson: JSON.stringify({
      role: 'customer',
      table_no: 'Table 3',
      action: 'new_order_or_bill',
      status: 'PREPARING',
      items: [
        { name: 'Chicken Tikka Baozi', qty: 2, price: 180 },
        { name: 'Fresh Lime Soda', qty: 2, price: 90 },
      ],
      total: 540,
    }, null, 2),
  },
  'Table 7': {
    id: 'ORD-701',
    table_no: 'Table 7',
    status: 'SERVED',
    items: [
      { name: 'Kurkure Chicken Momos', qty: 1, price: 190 },
      { name: 'Cold Coffee', qty: 1, price: 120 },
    ],
    subtotal: 310,
    gstAmount: 15.5,
    grandTotal: 325.5,
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    rawJson: JSON.stringify({
      role: 'customer',
      table_no: 'Table 7',
      action: 'new_order_or_bill',
      status: 'SERVED',
      items: [
        { name: 'Kurkure Chicken Momos', qty: 1, price: 190 },
        { name: 'Cold Coffee', qty: 1, price: 120 },
      ],
      total: 310,
    }, null, 2),
  },
  'Table 9': {
    id: 'ORD-901',
    table_no: 'Table 9',
    status: 'SETTLED',
    items: [
      { name: 'Kurkure Chicken Momos', qty: 2, price: 190 },
      { name: 'Cold Coffee', qty: 2, price: 120 },
    ],
    subtotal: 620,
    gstAmount: 31,
    grandTotal: 651,
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    settledAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
  },
};

let settledHistory: TableOrder[] = [
  tableOrders['Table 2'],
  tableOrders['Table 9'],
];

function calculateRevenueMetrics() {
  const settledList: TableOrder[] = [];
  const addedIds = new Set<string>();

  Object.values(tableOrders).forEach((o) => {
    if (o.status === 'SETTLED' && !addedIds.has(o.id)) {
      settledList.push(o);
      addedIds.add(o.id);
    }
  });

  settledHistory.forEach((o) => {
    if (!addedIds.has(o.id)) {
      settledList.push(o);
      addedIds.add(o.id);
    }
  });

  const netSubtotal = settledList.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);
  const totalGstCollected = Math.round(netSubtotal * 0.05 * 100) / 100;
  const totalGrossRevenue = Math.round((netSubtotal + totalGstCollected) * 100) / 100;
  const totalSettledOrders = settledList.length;
  const averageOrderValue = totalSettledOrders > 0 ? Math.round((totalGrossRevenue / totalSettledOrders) * 100) / 100 : 0;

  return {
    totalGrossRevenue,
    netSubtotal,
    totalGstCollected,
    totalSettledOrders,
    averageOrderValue,
    settledOrders: settledList,
  };
}

// Server-Sent Events (SSE) connections for real-time customer and staff updates
type SSEClient = { id: string; res: Response };
let sseClients: SSEClient[] = [];

function broadcastSSE(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch (e) {
      // client disconnected
    }
  });
}

// Central AI Engine System Instructions
const SAAS_AI_ENGINE_SYSTEM_PROMPT = `You are the central AI Engine for a premium Restaurant Management SaaS. Your system operates in two distinct modes based on the trigger tag provided in the user prompt.

--- GLOBAL DESIGN & TONE GUIDELINES ---
Whenever you generate UI text, layouts, or HTML/CSS code, you must strictly follow a clean, high-contrast, professional design aesthetic with minimalist typography. The tone should always be highly professional, tech-forward, and exceptionally hospitable.

=========================================
MODE 1: CUSTOMER INTERFACE (VIRTUAL WAITER)
Trigger: [Table: X]
=========================================
Your goal is to provide a seamless, contactless ordering and billing experience.

1. INITIALIZATION: Acknowledge the table number (e.g., "Welcome! You are seated at Table X.")
2. MENU & ORDERING: Present the menu clearly. Guide them to select items. 
3. ORDER STATUS: Maintain and update the order state. 
   - State 1: "ORDERING" (While selecting items)
   - State 2: "PREPARING" (Once order is sent to kitchen)
   - State 3: "SERVED" (Once food arrives)
4. BILLING & PAYMENT: When the customer types "Bill please" or "Pay", summarize the total order, add a 5% GST, and provide a dummy UPI/Payment link (e.g. upi://pay?pa=restaurant@saasbank&pn=PremiumDining&am=TOTAL&cu=INR).
5. DATA OUTPUT: Upon order confirmation or bill request, output a JSON block for the backend:
\`\`\`json
{
  "role": "customer",
  "table_no": "X",
  "action": "new_order_or_bill",
  "status": "PREPARING",
  "items": [{"name": "Item Name", "qty": 1, "price": 0}],
  "total": 0
}
\`\`\`

=========================================
MODE 2: STAFF DASHBOARD & KOT
Trigger: [Staff: <Staff Name or Role>]
=========================================
Your goal is to act as the internal command center for restaurant staff (Waiters, Chefs, Managers).

1. STAFF AUTHENTICATION: Welcome the staff member and display the active dashboard options:
   1. View Live Orders
   2. Update KOT Status
   3. Clear Table & Settle Bill
2. KOT MANAGEMENT: If the staff inputs a command like "Mark Table X as Served", update the status and notify the system.
3. TABLE CLEARING: If the staff inputs "Settle Table X", close the order and reset the table state.
4. DATA OUTPUT: For any staff action, output a JSON block for backend syncing:
\`\`\`json
{
  "role": "staff",
  "staff_name": "<Username>",
  "action": "update_status",
  "table_no": "X",
  "new_status": "SERVED"
}
\`\`\`
Or if settling table:
\`\`\`json
{
  "role": "staff",
  "staff_name": "<Username>",
  "action": "settle_table",
  "table_no": "X",
  "new_status": "SETTLED"
}
\`\`\`

--- DEFAULT MENU DATABASE ---
Signature Mains
- Classic Steamed Veg Momos (₹120)
- Chicken Tikka Baozi (₹180)
- Kurkure Chicken Momos (₹190)

Beverages
- Fresh Lime Soda (₹90)
- Cold Coffee (₹120)

CONSTRAINTS: Never invent menu items. Never output JSON outside of the specified format. Maintain a strict separation between Customer and Staff data.`;

// Robust Fallback Engines if Gemini API Key is pending
const OFFICIAL_MENU = [
  { name: 'Classic Steamed Veg Momos', price: 120, category: 'Signature Mains' },
  { name: 'Chicken Tikka Baozi', price: 180, category: 'Signature Mains' },
  { name: 'Kurkure Chicken Momos', price: 190, category: 'Signature Mains' },
  { name: 'Fresh Lime Soda', price: 90, category: 'Beverages' },
  { name: 'Cold Coffee', price: 120, category: 'Beverages' },
];

function fallbackMode1(prompt: string): string {
  const match = prompt.match(/\[Table:\s*([^\]]+)\]/i);
  const rawTable = match ? match[1].trim() : '5';
  const tableNo = rawTable.startsWith('Table') ? rawTable : `Table ${rawTable}`;
  const lower = prompt.toLowerCase();

  const isBill = lower.includes('bill') || lower.includes('pay') || lower.includes('checkout');
  const isConfirm = lower.includes('confirm') || lower.includes('finalize') || lower.includes('order') || lower.includes('send');

  // Match items in prompt
  const matchedItems: OrderItem[] = [];
  OFFICIAL_MENU.forEach((m) => {
    if (lower.includes(m.name.toLowerCase()) || lower.includes(m.name.split(' ')[0].toLowerCase())) {
      matchedItems.push({ name: m.name, qty: 1, price: m.price });
    }
  });

  if (isBill) {
    const existing = tableOrders[tableNo];
    const items = existing ? existing.items : (matchedItems.length > 0 ? matchedItems : [{ name: 'Chicken Tikka Baozi', qty: 1, price: 180 }]);
    const subtotal = items.reduce((acc, curr) => acc + curr.price * curr.qty, 0);
    const gst = Math.round(subtotal * 0.05 * 100) / 100;
    const grandTotal = subtotal + gst;
    const upiLink = `upi://pay?pa=restaurant@saasbank&pn=PremiumDining&am=${grandTotal}&cu=INR`;

    const jsonBlock = {
      role: 'customer',
      table_no: tableNo.replace('Table ', ''),
      action: 'new_order_or_bill',
      status: 'SERVED',
      items: items,
      total: grandTotal,
    };

    return `Welcome! You are seated at ${tableNo}.\n\nHere is your itemized bill summary:\n` +
      items.map(it => `- ${it.qty}x ${it.name} (₹${it.price * it.qty})`).join('\n') +
      `\n\nSubtotal: ₹${subtotal}\nGST (5%): ₹${gst}\nGrand Total: ₹${grandTotal}\nPayment Link: ${upiLink}\n\n` +
      `\`\`\`json\n${JSON.stringify(jsonBlock, null, 2)}\n\`\`\``;
  }

  if (isConfirm && matchedItems.length > 0) {
    const subtotal = matchedItems.reduce((acc, curr) => acc + curr.price * curr.qty, 0);
    const jsonBlock = {
      role: 'customer',
      table_no: tableNo.replace('Table ', ''),
      action: 'new_order_or_bill',
      status: 'PREPARING',
      items: matchedItems,
      total: subtotal,
    };

    return `Welcome! You are seated at ${tableNo}. Your order has been placed successfully.\n\nCurrent status is PREPARING. The kitchen is preparing your dishes.\n\n\`\`\`json\n${JSON.stringify(jsonBlock, null, 2)}\n\`\`\``;
  }

  // Ordering State
  return `Welcome! You are seated at ${tableNo}. Current status is ORDERING.\n\nHere is our curated menu:\n\n**Signature Mains**\n- Classic Steamed Veg Momos (₹120)\n- Chicken Tikka Baozi (₹180)\n- Kurkure Chicken Momos (₹190)\n\n**Beverages**\n- Fresh Lime Soda (₹90)\n- Cold Coffee (₹120)\n\nPlease let me know your selections or message 'Confirm order' when ready.`;
}

function fallbackMode2(prompt: string): string {
  const match = prompt.match(/\[Staff:\s*([^\]]+)\]/i);
  const staffName = match ? match[1].trim() : 'Staff Member';
  const lower = prompt.toLowerCase();

  // Check actions
  const servedMatch = prompt.match(/(?:mark|set)\s*Table\s*(\d+)\s*(?:as)?\s*served/i);
  const settleMatch = prompt.match(/(?:settle|clear)\s*Table\s*(\d+)/i);

  if (servedMatch) {
    const tableNum = servedMatch[1];
    const jsonBlock = {
      role: 'staff',
      staff_name: staffName,
      action: 'update_status',
      table_no: tableNum,
      new_status: 'SERVED',
    };
    return `Confirmed, ${staffName}. Table ${tableNum} has been updated to SERVED. The customer's interface has been updated automatically.\n\n\`\`\`json\n${JSON.stringify(jsonBlock, null, 2)}\n\`\`\``;
  }

  if (settleMatch) {
    const tableNum = settleMatch[1];
    const jsonBlock = {
      role: 'staff',
      staff_name: staffName,
      action: 'settle_table',
      table_no: tableNum,
      new_status: 'SETTLED',
    };
    return `Table ${tableNum} settled and cleared by ${staffName}. The table is now reset and marked available for the next guest.\n\n\`\`\`json\n${JSON.stringify(jsonBlock, null, 2)}\n\`\`\``;
  }

  // Default Dashboard authentication display
  return `Welcome, ${staffName}! You are connected to the central Staff Dashboard & KOT Engine.\n\nActive Dashboard Options:\n1. View Live Orders: Monitor active KOT prep tickets across all tables.\n2. Update KOT Status: Command e.g., 'Mark Table X as Served'.\n3. Clear Table & Settle Bill: Command e.g., 'Settle Table X'.\n\nHow may I assist you with table operations?`;
}

// 1. SSE Endpoint for Real-time Synchronization
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  // Send initial data
  res.write(`event: init\ndata: ${JSON.stringify({ tableOrders, revenueMetrics: calculateRevenueMetrics() })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter((c) => c.id !== clientId);
  });
});

// 2. Central AI Engine Endpoint
app.post('/api/ai/engine', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Prompt string is required.' });
      return;
    }

    const trimmed = prompt.trim();
    const isMode1 = trimmed.startsWith('[Table:');
    const isMode2 = trimmed.startsWith('[Staff:');

    let aiOutput = '';
    const client = getGeminiClient();

    if (client) {
      try {
        const geminiRes = await client.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: trimmed,
          config: {
            systemInstruction: SAAS_AI_ENGINE_SYSTEM_PROMPT,
            temperature: 0.3,
          },
        });
        aiOutput = geminiRes.text || '';
      } catch (geminiErr) {
        console.error('Gemini generate error, falling back to local engine:', geminiErr);
        aiOutput = isMode1 ? fallbackMode1(trimmed) : isMode2 ? fallbackMode2(trimmed) : 'Unrecognized system trigger.';
      }
    } else {
      aiOutput = isMode1 ? fallbackMode1(trimmed) : isMode2 ? fallbackMode2(trimmed) : 'Unrecognized system trigger.';
    }

    // Extract JSON Output Block
    let parsedJson: any = null;
    const jsonMatch = aiOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        parsedJson = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error('Failed to parse JSON block from AI output:', e);
      }
    }

    // Handle Backend Synchronization based on extracted JSON
    if (parsedJson) {
      if (parsedJson.role === 'customer') {
        const rawTable = parsedJson.table_no || '1';
        const formattedTable = rawTable.startsWith('Table') ? rawTable : `Table ${rawTable}`;
        const items: OrderItem[] = parsedJson.items || [];
        const subtotal = items.reduce((acc, curr) => acc + curr.price * curr.qty, 0);
        const gstAmount = Math.round(subtotal * 0.05 * 100) / 100;
        const grandTotal = subtotal + gstAmount;

        const updatedOrder: TableOrder = {
          id: tableOrders[formattedTable]?.id || `ORD-${Math.floor(100 + Math.random() * 900)}`,
          table_no: formattedTable,
          status: parsedJson.status || 'PREPARING',
          items: items.length > 0 ? items : (tableOrders[formattedTable]?.items || []),
          subtotal: subtotal || tableOrders[formattedTable]?.subtotal || 0,
          gstAmount: gstAmount || tableOrders[formattedTable]?.gstAmount || 0,
          grandTotal: grandTotal || tableOrders[formattedTable]?.grandTotal || 0,
          upiPaymentLink: `upi://pay?pa=restaurant@saasbank&pn=PremiumDining&am=${grandTotal}&cu=INR`,
          createdAt: tableOrders[formattedTable]?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          rawJson: jsonMatch ? jsonMatch[1] : JSON.stringify(parsedJson, null, 2),
        };

        tableOrders[formattedTable] = updatedOrder;
        broadcastSSE('table_update', {
          tableOrder: updatedOrder,
          allTables: tableOrders,
          revenueMetrics: calculateRevenueMetrics(),
        });
      } else if (parsedJson.role === 'staff') {
        const rawTable = parsedJson.table_no || '1';
        const formattedTable = rawTable.startsWith('Table') ? rawTable : `Table ${rawTable}`;

        if (parsedJson.action === 'settle_table' || parsedJson.new_status === 'SETTLED') {
          if (tableOrders[formattedTable]) {
            tableOrders[formattedTable].status = 'SETTLED';
            tableOrders[formattedTable].settledAt = new Date().toISOString();
            tableOrders[formattedTable].updatedAt = new Date().toISOString();
            if (!settledHistory.some((s) => s.id === tableOrders[formattedTable].id)) {
              settledHistory.push({ ...tableOrders[formattedTable] });
            }
          }
        } else if (parsedJson.new_status) {
          if (tableOrders[formattedTable]) {
            tableOrders[formattedTable].status = parsedJson.new_status;
            tableOrders[formattedTable].updatedAt = new Date().toISOString();
          } else {
            tableOrders[formattedTable] = {
              id: `ORD-${Math.floor(100 + Math.random() * 900)}`,
              table_no: formattedTable,
              status: parsedJson.new_status,
              items: [],
              subtotal: 0,
              gstAmount: 0,
              grandTotal: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          }
        }

        broadcastSSE('table_update', {
          tableOrder: tableOrders[formattedTable],
          allTables: tableOrders,
          staffAction: parsedJson,
          revenueMetrics: calculateRevenueMetrics(),
        });
      }
    }

    res.json({
      response: aiOutput,
      mode: isMode1 ? 'MODE_1_CUSTOMER' : isMode2 ? 'MODE_2_STAFF' : 'GENERAL',
      parsedJson,
      allTables: tableOrders,
      revenueMetrics: calculateRevenueMetrics(),
    });
  } catch (err: any) {
    console.error('Error in /api/ai/engine:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// 3. Tables & Order State Management Endpoints
app.get('/api/tables', (req: Request, res: Response) => {
  res.json({ tableOrders, revenueMetrics: calculateRevenueMetrics() });
});

app.get('/api/revenue', (req: Request, res: Response) => {
  res.json({ metrics: calculateRevenueMetrics() });
});

app.post('/api/tables/:tableNo/order', (req: Request, res: Response) => {
  const { tableNo } = req.params;
  const { items, status } = req.body;
  const formattedTable = tableNo.startsWith('Table') ? tableNo : `Table ${tableNo}`;

  const subtotal = (items || []).reduce((acc: number, curr: OrderItem) => acc + curr.price * curr.qty, 0);
  const gstAmount = Math.round(subtotal * 0.05 * 100) / 100;
  const grandTotal = subtotal + gstAmount;

  const newOrder: TableOrder = {
    id: `ORD-${Math.floor(100 + Math.random() * 900)}`,
    table_no: formattedTable,
    status: status || 'PREPARING',
    items: items || [],
    subtotal,
    gstAmount,
    grandTotal,
    upiPaymentLink: `upi://pay?pa=restaurant@saasbank&pn=PremiumDining&am=${grandTotal}&cu=INR`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rawJson: JSON.stringify({
      role: 'customer',
      table_no: formattedTable.replace('Table ', ''),
      action: 'new_order_or_bill',
      status: status || 'PREPARING',
      items,
      total: subtotal,
    }, null, 2),
  };

  tableOrders[formattedTable] = newOrder;
  broadcastSSE('table_update', {
    tableOrder: newOrder,
    allTables: tableOrders,
    revenueMetrics: calculateRevenueMetrics(),
  });
  res.status(201).json({ success: true, tableOrder: newOrder });
});

app.patch('/api/tables/:tableNo/status', (req: Request, res: Response) => {
  const { tableNo } = req.params;
  const { status, staffName } = req.body;
  const formattedTable = tableNo.startsWith('Table') ? tableNo : `Table ${tableNo}`;

  if (!tableOrders[formattedTable]) {
    res.status(404).json({ error: 'Table order not found' });
    return;
  }

  tableOrders[formattedTable].status = status;
  tableOrders[formattedTable].updatedAt = new Date().toISOString();
  if (status === 'SETTLED') {
    tableOrders[formattedTable].settledAt = new Date().toISOString();
    if (!settledHistory.some((s) => s.id === tableOrders[formattedTable].id)) {
      settledHistory.push({ ...tableOrders[formattedTable] });
    }
  }

  broadcastSSE('table_update', {
    tableOrder: tableOrders[formattedTable],
    allTables: tableOrders,
    staffAction: { staff_name: staffName, table_no: formattedTable, new_status: status },
    revenueMetrics: calculateRevenueMetrics(),
  });

  res.json({
    success: true,
    tableOrder: tableOrders[formattedTable],
    revenueMetrics: calculateRevenueMetrics(),
  });
});

// Production & Vite setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Restaurant SaaS AI Engine running on port ${PORT}`);
  });
}

startServer();
