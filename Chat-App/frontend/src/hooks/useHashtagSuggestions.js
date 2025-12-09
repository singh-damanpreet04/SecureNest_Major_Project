import { useState, useRef, useEffect, useCallback } from 'react';
import { getSuggestions } from '../services/hashtagService';

const useHashtagSuggestions = (onSuggestionSelect) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef(null);
  const lastKeywordRef = useRef('');
  
  // Function to get cursor position in the input
  const getCursorPosition = (element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const lineHeight = parseInt(style.lineHeight) || 20;
    
    // Get cursor position
    const cursorPosition = element.selectionStart;
    const textBeforeCursor = element.value.substring(0, cursorPosition);
    
    // Create a temporary element to measure text width
    const temp = document.createElement('span');
    temp.style.visibility = 'hidden';
    temp.style.whiteSpace = 'pre';
    temp.style.font = style.font;
    temp.textContent = textBeforeCursor;
    document.body.appendChild(temp);
    
    // Calculate position
    const left = rect.left + temp.offsetWidth;
    const top = rect.top;
    
    // Clean up
    document.body.removeChild(temp);
    
    return { left, top };
  };
  
  // Function to detect hashtag and fetch suggestions
  const handleInputChange = useCallback(async (text) => {
    console.log('Input changed:', text);
    
    // Extract the last word starting with #
    const matches = text.match(/#(\w+)$/);
    
    if (matches && matches[1]) {
      const keyword = matches[1].toLowerCase();
      
      // Don't trigger new fetch if we're already showing suggestions for this keyword
      if (keyword === lastKeywordRef.current) {
        console.log('Same keyword, skipping fetch');
        return;
      }
      
      lastKeywordRef.current = keyword;
      
      // Only show loading if we don't have suggestions yet
      if (suggestions.length === 0) {
        setIsLoading(true);
      }
      
      try {
        console.log('Fetching suggestions for keyword:', keyword);
        const fetchedSuggestions = await getSuggestions(keyword);
        console.log('Fetched suggestions:', fetchedSuggestions);
        
        setSuggestions(fetchedSuggestions);
        setSelectedIndex(0);
        setShowSuggestions(fetchedSuggestions.length > 0);
        
        // Update position after fetching suggestions
        if (inputRef.current) {
          const pos = getCursorPosition(inputRef.current);
          console.log('Setting suggestion position:', pos);
          setPosition({
            left: pos.left,
            top: pos.top - 10, // Position above the cursor
          });
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    } else {
      // No hashtag detected
      lastKeywordRef.current = '';
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, []);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!showSuggestions) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
        
      case 'Enter':
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          selectSuggestion(suggestions[selectedIndex]);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
        
      default:
        break;
    }
  }, [showSuggestions, suggestions, selectedIndex]);
  
  // Handle suggestion selection
  const selectSuggestion = useCallback((suggestion) => {
    if (!inputRef.current) return;
    
    const input = inputRef.current;
    const startPos = input.selectionStart;
    const endPos = input.selectionEnd;
    const text = input.value;
    
    // Find the last occurrence of #
    const lastHashIndex = text.lastIndexOf('#', startPos);
    
    if (lastHashIndex !== -1) {
      // Replace the hashtag with the suggestion
      const newText = 
        text.substring(0, lastHashIndex) + 
        suggestion + 
        ' ' + // Add a space after the suggestion
        text.substring(endPos);
      
      // Call the parent component's handler with the new text
      if (typeof onSuggestionSelect === 'function') {
        onSuggestionSelect(newText);
      } else {
        // Fallback to direct DOM manipulation if no handler provided
        input.value = newText;
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
      }
      
      // Set cursor position after the inserted suggestion
      const newCursorPos = lastHashIndex + suggestion.length + 1;
      setTimeout(() => {
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
      
      // Focus back on the input
      input.focus();
    }
    
    // Hide suggestions
    setShowSuggestions(false);
    setSuggestions([]);
    lastKeywordRef.current = '';
  }, []);
  
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target) &&
        !document.querySelector('.hashtag-suggestions')?.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return {
    inputRef,
    suggestions,
    isLoading,
    showSuggestions,
    selectedIndex,
    position,
    handleInputChange,
    handleKeyDown,
    selectSuggestion,
    setShowSuggestions,
    setSelectedIndex,
  };
};

export default useHashtagSuggestions;
