import { styled, Input as TamaguiInput, GetProps, Label, YStack, Text } from 'tamagui';

export const StyledInput = styled(TamaguiInput, {
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '$brandBorder',
  backgroundColor: '$background',
  height: 52,
  paddingHorizontal: 16,
  fontSize: 16,
  color: '$color',
  focusStyle: {
    borderColor: '$brandPrimary',
    borderWidth: 2,
  },
});

type InputFieldProps = GetProps<typeof StyledInput> & {
  label?: string;
  error?: string;
};

export function InputField({ label, error, ...props }: InputFieldProps) {
  return (
    <YStack gap="$1.5">
      {label && (
        <Label fontSize={14} fontWeight="500" color="$brandText">
          {label}
        </Label>
      )}
      <StyledInput
        {...props}
        borderColor={error ? '$brandError' : '$brandBorder'}
      />
      {error && (
        <Text fontSize={12} color="$brandError" paddingLeft="$2">
          {error}
        </Text>
      )}
    </YStack>
  );
}

export type { InputFieldProps };
