import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Story, STORY_TAGS } from '@/types/story';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';

interface StoryPreviewModalProps {
  story: Story | null;
  visible: boolean;
  onClose: () => void;
  onReadStory?: (story: Story) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function StoryPreviewModal({
  story,
  visible,
  onClose,
  onReadStory,
}: StoryPreviewModalProps) {
  const { scaledFontSize, scaledPadding, scaledButtonSize } = useAccessibility();

  if (!story) return null;

  const tagInfo = STORY_TAGS[story.category];
  const displayTags = story.tags || [story.tag];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        
        <Pressable 
          style={[styles.modalContent, { maxHeight: screenHeight * 0.75 }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Cover Image */}
          <View style={styles.coverContainer}>
            {story.coverImage ? (
              <Image
                source={typeof story.coverImage === 'string' ? { uri: story.coverImage } : story.coverImage}
                style={styles.coverImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.coverImage, styles.placeholderCover]}>
                <Text style={{ fontSize: 64 }}>{story.emoji}</Text>
              </View>
            )}
          </View>

          <ScrollView 
            style={styles.contentScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            <Text style={[styles.title, { fontSize: scaledFontSize(24) }]}>
              {story.title}
            </Text>

            {/* Author */}
            {story.author && (
              <Text style={[styles.author, { fontSize: scaledFontSize(14) }]}>
                by {story.author}
              </Text>
            )}

            {/* Metadata Row */}
            <View style={styles.metaRow}>
              {story.ageRange && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Audience</Text>
                  <Text style={[styles.metaValue, { fontSize: scaledFontSize(14) }]}>
                    Ages {story.ageRange}
                  </Text>
                </View>
              )}
              {story.duration && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Duration</Text>
                  <Text style={[styles.metaValue, { fontSize: scaledFontSize(14) }]}>
                    {story.duration} min
                  </Text>
                </View>
              )}
            </View>

            {/* Tags */}
            <View style={styles.tagsContainer}>
              <Text style={styles.sectionLabel}>Tags</Text>
              <View style={styles.tagsRow}>
                {displayTags.map((tag, index) => (
                  <View 
                    key={index} 
                    style={[styles.tag, { backgroundColor: tagInfo?.color || '#E0E0E0' }]}
                  >
                    <Text style={[styles.tagText, { fontSize: scaledFontSize(12) }]}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Description */}
            {story.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.sectionLabel}>About this story</Text>
                <Text style={[styles.description, { fontSize: scaledFontSize(14) }]}>
                  {story.description}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={[styles.closeButtonText, { fontSize: scaledFontSize(16) }]}>
                Close
              </Text>
            </Pressable>
            {story.isAvailable && onReadStory && (
              <Pressable
                style={styles.readButton}
                onPress={() => {
                  onClose();
                  onReadStory(story);
                }}
              >
                <Text style={[styles.readButtonText, { fontSize: scaledFontSize(16) }]}>
                  Read Story
                </Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: screenWidth * 0.85,
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  coverContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderCover: {
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentScroll: {
    padding: 20,
    maxHeight: 300,
  },
  title: {
    fontFamily: Fonts.primary,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 4,
  },
  author: {
    fontFamily: Fonts.sans,
    color: '#636E72',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 24,
  },
  metaItem: {},
  metaLabel: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: '#B2BEC3',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#2D3436',
  },
  tagsContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: '#B2BEC3',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontFamily: Fonts.sans,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  descriptionContainer: {
    marginBottom: 8,
  },
  description: {
    fontFamily: Fonts.sans,
    color: '#636E72',
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  closeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  closeButtonText: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#636E72',
  },
  readButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
  },
  readButtonText: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

