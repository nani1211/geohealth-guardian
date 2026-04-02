import React, { useState, useEffect } from 'react';
import { X, Share, Car, MessageCircle, Send, CheckCircle2 } from 'lucide-react';

const ShareETAModal = ({ routeData, onClose }) => {
  const [status, setStatus] = useState('preview'); // 'preview' | 'sending' | 'sent'
  
  // Use a mock recipient
  const contacts = ['Mom', 'Alex (Roommate)', 'Dad'];
  const [selectedContact, setSelectedContact] = useState(contacts[0]);

  // Construct mock message
  const destination = routeData?.summary?.endLabel?.split(',')[0] || 'destination';
  const minutes = routeData?.summary?.totalMinutes || 0;
  
  // Calculate mock arrival time
  const arrivalTime = new Date(Date.now() + minutes * 60000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const messageText = `I'm heading to ${destination}. My ETA is ${arrivalTime}. Follow my live trip on GeoHealth Guardian! 🗺️🚘`;

  const handleSend = () => {
    setStatus('sending');
    // Simulate network delay
    setTimeout(() => {
      setStatus('sent');
      setTimeout(() => {
        onClose();
      }, 2000);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
      {/* Modal Card */}
      <div className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center gap-2 text-white">
            <Share size={18} />
            <h2 className="font-semibold text-lg">Share ETA</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {status === 'preview' && (
          <div className="p-5 space-y-5 flex flex-col items-center">
            
            {/* Live Trip Hero Icon */}
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-1">
              <Car size={32} className="text-blue-600 animate-bounce" style={{animationDuration: '2s'}} />
            </div>
            
            <p className="text-[13px] text-gray-500 font-medium text-center px-4 leading-relaxed">
              Share your live location and route progress with emergency contacts or family.
            </p>

            {/* Message Preview */}
            <div className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 relative">
              <div className="absolute -top-3 left-4 bg-gray-100 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded text-gray-500 flex items-center gap-1">
                <MessageCircle size={10} /> iMessage Preview
              </div>
              <p className="text-sm text-gray-800 leading-snug mt-1">{messageText}</p>
            </div>

            {/* Recipient Selection */}
            <div className="w-full space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pl-1">Send To</label>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {contacts.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedContact(c)}
                    className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      selectedContact === c 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Action */}
            <button
              onClick={handleSend}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 flex justify-center items-center gap-2 transition-all active:scale-[0.98] mt-2 cursor-pointer"
            >
              <Send size={16} />
              Send Live Trip
            </button>
          </div>
        )}

        {status === 'sending' && (
          <div className="p-8 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm font-semibold text-gray-600">Securely sharing ETA...</p>
          </div>
        )}

        {status === 'sent' && (
          <div className="p-8 flex flex-col items-center justify-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-500">
              <CheckCircle2 size={32} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-800">Trip Shared!</h3>
              <p className="text-xs text-gray-500 mt-1">{selectedContact} can now follow your route.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ShareETAModal;
