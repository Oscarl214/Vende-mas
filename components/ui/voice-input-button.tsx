import { useState, useCallback, useRef } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { Text, YStack } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

type VoiceInputButtonProps = {
  onTranscript: (text: string) => void;
  lang?: string;
  size?: number;
};

export function VoiceInputButton({
  onTranscript,
  lang = 'en-US',
  size = 44,
}: VoiceInputButtonProps) {
  const { t } = useTranslation();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const finalRef = useRef('');

  const pulse = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const startPulse = useCallback(() => {
    pulse.value = withRepeat(
      withTiming(1.25, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const stopPulse = useCallback(() => {
    cancelAnimation(pulse);
    pulse.value = withTiming(1, { duration: 200 });
  }, [pulse]);

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      finalRef.current = transcript;
      setInterim('');
    } else {
      setInterim(transcript);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    stopPulse();
    if (finalRef.current) {
      onTranscript(finalRef.current);
      finalRef.current = '';
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    stopPulse();
    setInterim('');
    if (event.error === 'not-allowed') {
      Alert.alert(t('contentEngine.micPermissionDenied'));
    }
  });

  const toggle = useCallback(async () => {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      Alert.alert(t('contentEngine.micPermissionDenied'));
      return;
    }

    finalRef.current = '';
    setInterim('');
    setListening(true);
    startPulse();

    ExpoSpeechRecognitionModule.start({
      lang,
      interimResults: true,
      addsPunctuation: true,
    });
  }, [listening, lang, startPulse, t]);

  return (
    <YStack alignItems="center" gap="$1">
      <Pressable onPress={toggle} accessibilityLabel={t('contentEngine.voiceTapToSpeak')}>
        <Animated.View
          style={[
            styles.circle,
            { width: size, height: size, borderRadius: size / 2 },
            listening && styles.circleActive,
            animatedStyle,
          ]}
        >
          <Ionicons
            name={listening ? 'mic' : 'mic-outline'}
            size={size * 0.5}
            color={listening ? '#fff' : '#0F766E'}
          />
        </Animated.View>
      </Pressable>
      {listening && interim.length > 0 && (
        <Text fontSize={11} color="$brandTextLight" numberOfLines={1} maxWidth={180}>
          {interim}
        </Text>
      )}
      {listening && interim.length === 0 && (
        <Text fontSize={11} color="$brandPrimary" fontWeight="500">
          {t('contentEngine.voiceListening')}
        </Text>
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleActive: {
    backgroundColor: '#0F766E',
  },
});
