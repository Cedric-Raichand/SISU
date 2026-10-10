
import React from 'react';
import {
  Pressable,
  Text,
  View,
  StyleSheet,
} from 'react-native';

export default function FeatureCard({
  emoji,
  title,
  description,
  onPress,
}) {
  return (
    <Pressable
      style={styles.featureCard}
      onPress={onPress}
    >
      <Text style={styles.featureEmoji}>{emoji}</Text>

      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>

        <Text style={styles.featureDescription}>
          {description}
        </Text>
      </View>

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EEEA',
    borderRadius: 15,
    marginBottom: 11,
  },

  featureEmoji: {
    fontSize: 28,
    marginRight: 13,
  },

  featureContent: {
    flex: 1,
  },

  featureTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#153E35',
    marginBottom: 5,
  },

  featureDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#667085',
  },

  chevron: {
    fontSize: 24,
    color: '#126B58',
    marginLeft: 8,
  },
});