import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Navigation, Search } from 'lucide-react';
import { suggestAddresses } from '../services/geocodeService';

const AutocompleteInput = ({
  value,
  onChange,
  onSelect,
  placeholder,
  icon: Icon = Search,
  iconColorClass = 'text-gray-500',
  className = '',
  buttonAction, // { icon, onClick, title, activeClass, inactiveClass, isActive }
}) => {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const wrapperRef = useRef(null);

  // Sync external value
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!query.trim() || query === value) {
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await suggestAddresses(query);
        setSuggestions(results || []);
      } catch (err) {
        console.error('Suggest error:', err);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timerId = setTimeout(fetchSuggestions, 400); // 400ms debounce
    return () => clearTimeout(timerId);
  }, [query, value]);

  const handleChange = (e) => {
    setQuery(e.target.value);
    onChange(e.target.value);
    if (!showDropdown) setShowDropdown(true);
  };

  const handleSelect = (item) => {
    setQuery(item.label);
    onChange(item.label);
    setShowDropdown(false);
    if (onSelect) onSelect(item);
  };

  return (
    <div className={`relative flex items-center group ${className}`} ref={wrapperRef}>
      <Icon size={14} className={`absolute left-3 z-10 ${iconColorClass}`} />
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => { if (query && suggestions.length) setShowDropdown(true); }}
        placeholder={placeholder}
        className="w-full pl-9 pr-10 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl
                   focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400
                   placeholder:text-gray-400"
      />
      
      {/* Right action button OR loader */}
      <div className="absolute right-1.5 flex items-center justify-center p-1.5">
        {isSearching ? (
          <Loader2 size={14} className="animate-spin text-gray-400" />
        ) : buttonAction ? (
          <button 
            type="button"
            onClick={buttonAction.onClick}
            className={`rounded-lg transition-all p-1.5 ${
              buttonAction.isActive ? buttonAction.activeClass : buttonAction.inactiveClass
            }`}
            title={buttonAction.title}
          >
            <buttonAction.icon size={14} />
          </button>
        ) : null}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-12 left-0 right-0 z-50 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto ring-1 ring-black/5">
          {suggestions.map((item, i) => (
            <button
              key={`${item.id}-${i}`}
              type="button"
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex flex-col items-start border-b border-gray-100 last:border-0"
              onClick={() => handleSelect(item)}
            >
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-gray-400 shrink-0" />
                <span className="text-sm font-medium text-gray-800 line-clamp-1">{item.name}</span>
              </div>
              {item.context && (
                <span className="text-xs text-gray-500 pl-5 line-clamp-1 truncate w-full">{item.context}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;
