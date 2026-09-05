import React, { useState } from 'react';
import { X, Database, Truck, Package, ShoppingCart, ShieldCheck } from 'lucide-react';
import { MockDB } from '../types';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbData: MockDB | null;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({ isOpen, onClose, dbData }) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'pos' | 'orders' | 'suppliers'>('inventory');

  if (!isOpen || !dbData) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 rounded-lg text-[#0F172A]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600">
                Supply Chain Master Catalog
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">data/mock_db.json (Ground Truth Baseline)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-[#E2E8F0] flex space-x-6 text-[11px] font-bold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-3 border-b-2 flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'inventory'
                ? 'border-[#0F172A] text-[#0F172A]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Inventory ({dbData.inventory.length})
          </button>
          <button
            onClick={() => setActiveTab('pos')}
            className={`py-3 border-b-2 flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'pos'
                ? 'border-[#0F172A] text-[#0F172A]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Active Inbound POs ({dbData.inbound_pos.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 border-b-2 flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'orders'
                ? 'border-[#0F172A] text-[#0F172A]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Outbound Orders ({dbData.outbound_orders.length})
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`py-3 border-b-2 flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'suppliers'
                ? 'border-[#0F172A] text-[#0F172A]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Suppliers ({dbData.suppliers.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          {activeTab === 'inventory' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3">On-Hand Stock</th>
                    <th className="py-2.5 px-3">Safety Stock</th>
                    <th className="py-2.5 px-3">Unit Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dbData.inventory.map((item) => (
                    <tr key={item.sku} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-800">{item.sku}</td>
                      <td className="py-3 px-3 font-medium text-[#0F172A]">{item.name}</td>
                      <td className="py-3 px-3 font-mono text-slate-700">{item.on_hand} units</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{item.safety_stock} units</td>
                      <td className="py-3 px-3 font-mono text-slate-700">${item.unit_cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'pos' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-2.5 px-3">PO Number</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Carrier / Tracking</th>
                    <th className="py-2.5 px-3">Promised Dock Date</th>
                    <th className="py-2.5 px-3">Quantity</th>
                    <th className="py-2.5 px-3">Supplier ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dbData.inbound_pos.map((po) => (
                    <tr key={po.po_number} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono font-semibold text-[#0F172A]">{po.po_number}</td>
                      <td className="py-3 px-3 font-mono text-slate-700">{po.sku}</td>
                      <td className="py-3 px-3 text-slate-600">
                        {po.carrier} <span className="font-mono text-slate-400">({po.tracking})</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">{po.dock_date}</td>
                      <td className="py-3 px-3 font-mono font-medium text-[#0F172A]">{po.quantity}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{po.supplier_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Tier</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Quantity</th>
                    <th className="py-2.5 px-3">Ship Date</th>
                    <th className="py-2.5 px-3">SLA Penalty</th>
                    <th className="py-2.5 px-3">Partial Allowed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dbData.outbound_orders.map((o) => (
                    <tr key={o.order_id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono font-semibold text-[#0F172A]">{o.order_id}</td>
                      <td className="py-3 px-3 font-semibold text-[#0F172A]">{o.customer}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            o.tier === 'Strategic'
                              ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {o.tier}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">{o.sku}</td>
                      <td className="py-3 px-3 font-mono text-[#0F172A] font-semibold">{o.quantity}</td>
                      <td className="py-3 px-3 font-mono text-slate-700">{o.ship_date}</td>
                      <td className="py-3 px-3 font-mono text-[#0F172A] font-semibold">${o.sla_penalty}/day</td>
                      <td className="py-3 px-3 text-slate-600">{o.allow_partial ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'suppliers' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Supplier ID</th>
                    <th className="py-2.5 px-3">Formal Entity Name</th>
                    <th className="py-2.5 px-3">Recognized Aliases</th>
                    <th className="py-2.5 px-3">Origin</th>
                    <th className="py-2.5 px-3">Std Lead Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dbData.suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono font-semibold text-[#0F172A]">{s.id}</td>
                      <td className="py-3 px-3 font-semibold text-[#0F172A]">{s.name}</td>
                      <td className="py-3 px-3 text-slate-600">
                        <div className="flex flex-wrap gap-1">
                          {s.aliases.map((a, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-700 border border-slate-200">
                              {a}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{s.origin}</td>
                      <td className="py-3 px-3 font-mono text-slate-700">{s.lead_time_days} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-[#E2E8F0] text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0F172A] text-white rounded-lg text-[10px] font-bold uppercase hover:bg-slate-800 transition cursor-pointer shadow-xs"
          >
            Close Catalog
          </button>
        </div>
      </div>
    </div>
  );
};
