import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

// Fades and slides its content in when it first appears. Give it a `key` that
// changes with the screen to animate each screen change.
export default function FadeInView({
  children,
  style,
  duration = 220,
  distance = 10,
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, duration]);

  return (
    <Animated.View
      style={[
        {
          flex: 1,
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}