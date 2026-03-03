import { styled, Button as TamaguiButton, GetProps } from 'tamagui';

export const Button = styled(TamaguiButton, {
  borderRadius: 12,
  fontWeight: '600',
  fontSize: 16,
  height: 52,
  pressStyle: {
    opacity: 0.85,
    scale: 0.98,
  },

  variants: {
    variant: {
      primary: {
        backgroundColor: '$brandPrimary',
        color: '$brandTextInverse',
        hoverStyle: { backgroundColor: '$brandPrimaryDark' },
      },
      secondary: {
        backgroundColor: '$brandSecondary',
        color: '$brandTextInverse',
        hoverStyle: { backgroundColor: '$brandSecondaryLight' },
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '$brandBorder',
        color: '$brandText',
        hoverStyle: { backgroundColor: '$brandBackground' },
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '$brandPrimary',
        hoverStyle: { backgroundColor: '$brandBackground' },
      },
    },
  } as const,

  defaultVariants: {
    variant: 'primary',
  },
});

export type ButtonProps = GetProps<typeof Button>;
