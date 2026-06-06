/**
 * Toggle switch (spec §5.5). 52×31 track, 25px knob; off slate-300 / on teal.
 * Animated knob slide (3 → 24px) with a slight overshoot, using RN Animated
 * (no reanimated dependency).
 */
import React, {useEffect, useRef} from 'react';
import {Animated, Pressable, StyleSheet} from 'react-native';
import {DukaanColors, Elevation, Palette} from '../../constants/theme';

interface ToggleProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
}

export function Toggle({value, onValueChange, disabled}: ToggleProps): React.JSX.Element {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false, // animating backgroundColor + left
    }).start();
  }, [value, anim]);

  const knobLeft = anim.interpolate({inputRange: [0, 1], outputRange: [3, 24]});
  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [Palette.slate[300], DukaanColors.teal],
  });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{checked: value, disabled}}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={disabled ? styles.disabled : undefined}>
      <Animated.View style={[styles.track, {backgroundColor: trackColor}]}>
        <Animated.View style={[styles.knob, {left: knobLeft}]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 52,
    height: 31,
    borderRadius: 999,
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute',
    width: 25,
    height: 25,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    ...Elevation.sm,
  },
  disabled: {opacity: 0.5},
});
