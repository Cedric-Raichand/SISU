import React from 'react';
import {
  Pressable,
  View,
  Text,
  StyleSheet,
} from 'react-native';

export default function PetCard({
  pet,
  onPress,
  emoji,
}) {
  return (
    <Pressable
      style={styles.petCard}
      onPress={onPress}
    >
      <View style={styles.petCardEmoji}>
        <Text style={styles.petEmoji}>
          {emoji}
        </Text>
      </View>

      <View style={styles.petCardContent}>
        <Text style={styles.petCardName}>
          {pet.name}
        </Text>

        <Text style={styles.petCardSubtitle}>
          {[pet.species, pet.breed]
            .filter(Boolean)
            .join(' · ')}
        </Text>

        <Text style={styles.petCardMeta}>
          {pet.healthRecords.length} health record(s) ·{' '}
          {pet.vaccinations.length} vaccination(s)
        </Text>
      </View>

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E7EEEA',
  },

  petCardEmoji: {
    width: 54,
    height: 54,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5F0',
    marginRight: 13,
  },

  petEmoji: {
    fontSize: 28,
  },

  petCardContent: {
    flex: 1,
  },

  petCardName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#153E35',
    marginBottom: 4,
  },

  petCardSubtitle: {
    color: '#667085',
    fontSize: 13,
    marginBottom: 5,
  },

  petCardMeta: {
    color: '#667085',
    fontSize: 11,
  },

  chevron: {
    fontSize: 28,
    color: '#98A2B3',
    marginLeft: 8,
  },
});