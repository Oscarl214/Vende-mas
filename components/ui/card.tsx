import { styled, YStack, GetProps } from 'tamagui';

export const Card = styled(YStack, {
  backgroundColor: '$background',
  borderRadius: 16,
  padding: '$4',
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.07)',
  shadowColor: '#000',
  shadowOpacity: 0.04,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },

  variants: {
    variant: {
      elevated: {
        borderColor: 'rgba(0,0,0,0.06)',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      },
      outlined: {
        shadowOpacity: 0,
        elevation: 0,
        borderWidth: 1.5,
        borderColor: '$brandBorder',
      },
      flat: {
        shadowOpacity: 0,
        elevation: 0,
        borderWidth: 0,
        backgroundColor: '$brandBackground',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'elevated',
  },
});

export type CardProps = GetProps<typeof Card>;
