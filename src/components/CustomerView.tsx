import React, { useState, useEffect, useRef } from 'react';
import { TableOrder, OrderItem, ChatMessage, CustomerJSONOutput } from '../types';
import { SAAS_MENU } from '../data/menu';
import { sound } from '../utils/audio';
import {
  Send,
  Plus,
  Minus,
  CheckCircle2,
  QrCode,
  Flame,
  Receipt,
  RefreshCw,
  ShoppingBag,
  MessageSquare,
  UtensilsCrossed,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface CustomerViewProps {
  activeTableNo: string;
  onTableChange: (tableNo: string) => void;
  tableOrder?: TableOrder;
  onOrderUpdate: (tableNo: string, items: OrderItem[], status: 'ORDERING' | 'PREPARING') => Promise<void>;
  compactMode?: boolean;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  activeTableNo,
  onTableChange,
  tableOrder,
  onOrderUpdate,
  compactMode = false,
}) => {
  const [cart, setCart] = useState<{ [itemName: string]: number }>({});
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'menu' | 'chat'>('menu');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'ai',
      roleType: 'customer',
      text: `Welcome! You are seated at ${activeTableNo}.\n\nI am your contactless Virtual Waiter. What would you like to order today? You can select from our Signature Mains and Beverages or tell me your preferences.`,
      timestamp: 'Just now',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync table status
  const currentStatus = tableOrder?.status || 'ORDERING';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle table switch
  const handleSelectTable = (table: string) => {
    onTableChange(table);
    sound.playTap();
    setCart({});
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'ai',
        roleType: 'customer',
        text: `Welcome! You are seated at ${table}.\n\nCurrent status is ORDERING. Please let me know what you'd like from our menu.`,
        timestamp: 'Just now',
      },
    ]);
  };

  const addToCart = (itemName: string) => {
    sound.playTap();
    setCart((prev) => ({
      ...prev,
      [itemName]: (prev[itemName] || 0) + 1,
    }));
  };

  const removeFromCart = (itemName: string) => {
    sound.playTap();
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[itemName] > 1) {
        updated[itemName] -= 1;
      } else {
        delete updated[itemName];
      }
      return updated;
    });
  };

  // Convert cart to OrderItem array
  const cartItems: OrderItem[] = Object.entries(cart).map(([name, qty]) => {
    const menuItem = SAAS_MENU.find((m) => m.name === name);
    return { name, qty, price: menuItem ? menuItem.price : 0 };
  });

  const cartTotalQuantity = cartItems.reduce((acc, curr) => acc + curr.qty, 0);
  const cartSubtotal = cartItems.reduce((acc, curr) => acc + curr.price * curr.qty, 0);

  // Send message to Central AI Engine in Mode 1: [Table: X]
  const handleSendMessage = async (textToSend?: string) => {
    const message = textToSend || inputMessage;
    if (!message.trim() || isLoading) return;

    sound.playTap();
    const userPrompt = message.trim();
    setInputMessage('');

    // Add customer prompt to chat
    const customerMsg: ChatMessage = {
      id: `cust-${Date.now()}`,
      sender: 'customer',
      roleType: 'customer',
      text: userPrompt,
      timestamp: 'Just now',
    };
    setMessages((prev) => [...prev, customerMsg]);
    setIsLoading(true);

    // Switch to chat view so user sees response
    setActiveSubTab('chat');

    // Format strict Mode 1 Trigger
    const rawTableNumber = activeTableNo.replace(/[^0-9]/g, '') || activeTableNo;
    const fullTriggerPrompt = `[Table: ${rawTableNumber}] ${userPrompt}`;

    try {
      const res = await fetch('/api/ai/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullTriggerPrompt }),
      });
      const data = await res.json();

      const aiResponse = data.response || 'Request processed.';
      const parsedJson: CustomerJSONOutput = data.parsedJson;

      if (parsedJson && parsedJson.status === 'PREPARING') {
        sound.playKitchenChime();
        // Clear cart after order is confirmed into kitchen
        setCart({});
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          roleType: 'customer',
          text: aiResponse,
          timestamp: 'Just now',
          jsonBlock: parsedJson,
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ai',
          roleType: 'customer',
          text: 'Unable to reach the AI Engine. Please verify your connection.',
          timestamp: 'Just now',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Place order from cart
  const handleConfirmOrder = () => {
    if (cartItems.length === 0) return;
    const itemSummary = cartItems.map((c) => `${c.qty}x ${c.name}`).join(', ');
    handleSendMessage(`Confirm my order for ${activeTableNo}: ${itemSummary}. Please send to the kitchen display.`);
  };

  // Request bill calculation
  const handleRequestBill = () => {
    handleSendMessage(`Bill please for ${activeTableNo}.`);
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-900 relative">
      {/* 1. High-Contrast Table Header & Live State Badge */}
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          {/* Status Indicator */}
          {currentStatus === 'ORDERING' && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-medium shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              <span className="font-semibold">STATE 1: ORDERING</span>
            </div>
          )}

          {currentStatus === 'PREPARING' && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-xs font-mono font-semibold shadow-xs">
              <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span>STATE 2: PREPARING</span>
            </div>
          )}

          {currentStatus === 'SERVED' && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-mono font-semibold shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>STATE 3: SERVED</span>
            </div>
          )}

          {currentStatus === 'SETTLED' && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs font-mono shadow-xs">
              <Receipt className="w-3.5 h-3.5 text-slate-500" />
              <span>SETTLED</span>
            </div>
          )}
        </div>

        {/* Table Selector Dropdown & Bill action */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs shadow-xs">
            <QrCode className="w-3.5 h-3.5 text-slate-500 mr-2" />
            <select
              value={activeTableNo}
              onChange={(e) => handleSelectTable(e.target.value)}
              className="bg-transparent text-slate-900 font-bold focus:outline-hidden cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                <option key={num} value={`Table ${num}`} className="bg-white text-slate-900">
                  Table {num}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRequestBill}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95 shadow-xs"
            title="Request final bill with 5% GST"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Bill please</span>
          </button>
        </div>
      </div>

      {/* 2. Compact View Mode Tab Switcher (Menu vs Virtual Waiter) */}
      <div className="px-3 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center bg-slate-200/80 rounded-xl p-1 text-xs">
          <button
            onClick={() => {
              setActiveSubTab('menu');
              sound.playTap();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeSubTab === 'menu'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Menu & Selection</span>
            {cartTotalQuantity > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-400 text-slate-950">
                {cartTotalQuantity}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveSubTab('chat');
              sound.playTap();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeSubTab === 'chat'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Virtual Waiter</span>
          </button>
        </div>

        {/* Header mini cart preview */}
        {cartTotalQuantity > 0 && (
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500 text-[11px] hidden sm:inline">In Cart:</span>
            <span className="text-blue-700 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
              ₹{cartSubtotal}
            </span>
          </div>
        )}
      </div>

      {/* 3. Main Workspace Area: Clean Switch Between Menu Catalog and Chat */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {/* TAB A: Menu Catalog with Docked Bottom Cart Bar */}
        {activeSubTab === 'menu' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/40">
            {/* Scrollable Menu Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200 mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                  Official Menu Database
                </span>
                <span className="text-[11px] font-mono text-slate-500">Contactless • 5% GST at Checkout</span>
              </div>

              {SAAS_MENU.map((item) => {
                const qtyInCart = cart[item.name] || 0;
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          {item.name}
                        </span>
                        {item.popular && (
                          <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            Popular
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-400">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                      <div className="mt-1 text-xs font-bold text-blue-700 font-mono">
                        ₹{item.price}
                      </div>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1 shrink-0">
                      {qtyInCart > 0 ? (
                        <>
                          <button
                            onClick={() => removeFromCart(item.name)}
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-mono font-bold text-slate-900 px-1.5">
                            {qtyInCart}
                          </span>
                          <button
                            onClick={() => addToCart(item.name)}
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => addToCart(item.name)}
                          className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DOCKED BOTTOM CART BAR (Cleanly positioned at the bottom of the screen, never in the middle) */}
            {cartTotalQuantity > 0 ? (
              <div className="p-3.5 border-t border-slate-200 bg-white/95 backdrop-blur-md flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs font-mono shadow-xs">
                    <ShoppingBag className="w-4 h-4 mr-0.5" />
                    {cartTotalQuantity}
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-semibold">
                      {cartItems.length} Unique Item{cartItems.length > 1 ? 's' : ''} Selected
                    </div>
                    <div className="text-sm font-bold text-slate-900 font-mono">
                      Subtotal: <span className="text-blue-700 font-black">₹{cartSubtotal}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleConfirmOrder}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 transition-transform active:scale-95 shadow-sm disabled:opacity-50"
                >
                  <span>Confirm Order</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 font-mono flex items-center justify-between">
                <span>Select items above to build your order ticket</span>
                <button
                  onClick={() => setActiveSubTab('chat')}
                  className="text-blue-700 font-semibold hover:text-blue-800 flex items-center gap-1 transition-colors"
                >
                  <span>Or ask AI Waiter</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB B: Full Height Virtual Waiter Chat Panel */}
        {activeSubTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/60">
            {/* Chat Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'customer' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs ${
                      msg.sender === 'customer'
                        ? 'bg-blue-600 text-white font-medium rounded-br-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                    {/* Backend Synced JSON Output inspection */}
                    {msg.jsonBlock && msg.jsonBlock.role === 'customer' && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[10px] text-emerald-400 space-y-1">
                        <div className="flex items-center justify-between text-slate-300 border-b border-slate-700 pb-1 font-bold">
                          <span>Backend Synced JSON (Role: customer)</span>
                          <span className="text-amber-300">Table {msg.jsonBlock.table_no}</span>
                        </div>
                        <div className="pt-1 text-slate-200">
                          {msg.jsonBlock.items?.map((it: OrderItem, idx: number) => (
                            <div key={idx} className="flex justify-between">
                              <span>{it.qty}x {it.name}</span>
                              <span>₹{it.price * it.qty}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-700">
                          <span>Total: ₹{msg.jsonBlock.total}</span>
                          <span className="text-amber-400 font-mono">{msg.jsonBlock.status}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1 font-mono">
                    {msg.sender === 'customer' ? activeTableNo : 'Virtual Waiter'} • {msg.timestamp}
                  </span>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-2">
                  <div className="bg-white border border-slate-200 text-slate-600 rounded-2xl px-3.5 py-2 text-xs flex items-center gap-2 shadow-xs">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span>Virtual Waiter processing request...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Chips */}
            <div className="px-3 py-2 border-t border-slate-200 bg-white flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => handleSendMessage('Please show me the signature momos and baozi.')}
                className="text-[11px] whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-medium transition-colors"
              >
                🥟 View Menu
              </button>
              <button
                onClick={() => handleSendMessage('I want 1 Chicken Tikka Baozi and 1 Fresh Lime Soda.')}
                className="text-[11px] whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-medium transition-colors"
              >
                🍗 Baozi + Soda
              </button>
              <button
                onClick={() => handleSendMessage('Please confirm my order and send to kitchen.')}
                className="text-[11px] whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold transition-colors"
              >
                ⚡ Confirm Order
              </button>
              <button
                onClick={handleRequestBill}
                className="text-[11px] whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 font-semibold transition-colors"
              >
                💳 Bill please (5% GST)
              </button>
            </div>

            {/* Chat Input Field pinned at bottom */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
            >
              <input
                type="text"
                placeholder={`Message AI Waiter for ${activeTableNo}... (e.g. 'Bill please' or 'Order 2 Kurkure Chicken Momos')`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isLoading}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all disabled:opacity-40 shrink-0 font-bold shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
