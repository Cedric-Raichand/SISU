import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Keyboard, Platform, ScrollView, TextInput, View } from 'react-native';

// How far (in px) to keep the focused field away from the keyboard / edges.
const MARGIN = 24;

// Inputs call requestKeyboardAdjust() when they gain focus so a scroll view
// that is already showing can move the field into view, even when the keyboard
// was already open (for example when tapping from one field to the next).
const adjustListeners = new Set();

export function requestKeyboardAdjust() {
  adjustListeners.forEach((listener) => listener());
}

function getFocusedInput() {
  try {
    const state = TextInput.State;

    if (state && typeof state.currentlyFocusedInput === 'function') {
      return state.currentlyFocusedInput();
    }
  } catch (error) {
    // Not available on this platform; nothing to scroll to.
  }

  return null;
}

/**
 * A drop-in replacement for ScrollView that keeps the focused text field
 * visible above the on-screen keyboard.
 *
 * It does not depend on the platform resizing the window: it measures where
 * the keyboard is and adds just enough space under the content to scroll the
 * field clear of it. If the system already resized the screen it adds nothing.
 */
const KeyboardAwareScrollView = forwardRef(function KeyboardAwareScrollView(
  { children, onScroll, onLayout, ...rest },
  forwardedRef
) {
  const scrollRef = useRef(null);
  const offsetRef = useRef(0);
  const keyboardTopRef = useRef(null);
  const timersRef = useRef([]);
  const [spacer, setSpacer] = useState(0);

  useImperativeHandle(forwardedRef, () => scrollRef.current);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const later = useCallback((fn, delay) => {
    timersRef.current.push(setTimeout(fn, delay));
  }, []);

  const adjust = useCallback(() => {
    const scroll = scrollRef.current;
    const input = getFocusedInput();

    if (
      !scroll ||
      !input ||
      typeof scroll.measureInWindow !== 'function' ||
      typeof input.measureInWindow !== 'function'
    ) {
      return;
    }

    scroll.measureInWindow((sx, sy, sw, sh) => {
      input.measureInWindow((ix, iy, iw, ih) => {
        const values = [sx, sy, sw, sh, ix, iy, iw, ih];

        if (!values.every(Number.isFinite)) {
          return;
        }

        // Ignore a focused field that lives in some other view.
        if (ix + iw < sx || ix > sx + sw) {
          return;
        }

        const keyboardTop = keyboardTopRef.current;
        const bottomEdge =
          keyboardTop == null ? sy + sh : Math.min(sy + sh, keyboardTop);
        const visibleBottom = bottomEdge - MARGIN;
        const visibleTop = sy + MARGIN;
        const inputBottom = iy + ih;

        let delta = 0;

        if (ih > visibleBottom - visibleTop) {
          // Taller than the visible area (a long notes box): show its top.
          delta = iy - visibleTop;
        } else if (inputBottom > visibleBottom) {
          delta = inputBottom - visibleBottom;
        } else if (iy < visibleTop) {
          delta = iy - visibleTop;
        }

        if (Math.abs(delta) > 1) {
          scroll.scrollTo({
            y: Math.max(0, offsetRef.current + delta),
            animated: true,
          });
        }
      });
    });
  }, []);

  const measureSpacer = useCallback(() => {
    const scroll = scrollRef.current;
    const keyboardTop = keyboardTopRef.current;

    if (keyboardTop == null) {
      setSpacer(0);
      return;
    }

    if (!scroll || typeof scroll.measureInWindow !== 'function') {
      return;
    }

    scroll.measureInWindow((sx, sy, sw, sh) => {
      if (![sy, sh].every(Number.isFinite)) {
        return;
      }

      // Only the part of this view that the keyboard actually covers needs
      // extra room. If the window was already resized this is 0.
      setSpacer(Math.max(0, Math.round(sy + sh - keyboardTop)));
    });
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const coordinates = event && event.endCoordinates;

      keyboardTopRef.current =
        coordinates && Number.isFinite(coordinates.screenY)
          ? coordinates.screenY
          : null;

      clearTimers();
      measureSpacer();
      later(adjust, 60);
      later(adjust, 320);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardTopRef.current = null;
      clearTimers();
      setSpacer(0);
    });

    const onFocusRequest = () => {
      clearTimers();
      later(adjust, 60);
      later(adjust, 320);
    };

    adjustListeners.add(onFocusRequest);

    return () => {
      showSub.remove();
      hideSub.remove();
      adjustListeners.delete(onFocusRequest);
      clearTimers();
    };
  }, [adjust, clearTimers, later, measureSpacer]);

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      scrollEventThrottle={16}
      {...rest}
      onScroll={(event) => {
        offsetRef.current = event.nativeEvent.contentOffset.y;

        if (onScroll) {
          onScroll(event);
        }
      }}
      onLayout={(event) => {
        // The window may have been resized by the system after the keyboard
        // opened, so work out the extra room again.
        measureSpacer();

        if (onLayout) {
          onLayout(event);
        }
      }}
    >
      {children}
      {spacer > 0 ? <View style={{ height: spacer }} /> : null}
    </ScrollView>
  );
});

export default KeyboardAwareScrollView;