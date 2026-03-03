import { styled, YStack, GetProps } from 'tamagui';

export const Card = styled(YStack, {
  backgroundColor: '$background',
  borderRadius: 16,
  padding: '$4',
  borderWidth: 1,
  borderColor: '$brandBorder',
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },

  variants: {
    variant: {
      elevated: {
        shadowOpacity: 0.1,
        shadowRadius: 20,
        borderWidth: 0,
      },
      outlined: {
        shadowOpacity: 0,
        borderWidth: 1.5,
      },
      flat: {
        shadowOpacity: 0,
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
