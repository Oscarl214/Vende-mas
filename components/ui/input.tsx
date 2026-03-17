import { styled, Input as TamaguiInput, GetProps, Label, YStack, Text } from 'tamagui';

export const StyledInput = styled(TamaguiInput, {
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '$brandBorder',
  backgroundColor: '$background',
  paddingHorizontal: 16,
  fontSize: 16,
  color: '$brandText',
  focusStyle: {
    borderColor: '$brandPrimary',
    borderWidth: 2,
  },
});

type InputFieldProps = GetProps<typeof StyledInput> & {
  label?: string;
  error?: string;
};

export function InputField({ label, error, multiline, numberOfLines, ...props }: InputFieldProps) {
  // Single-line: fixed 52px height. Multiline: grows from a min-height, text anchored to top.
  const heightProps = multiline
    ? {
        height: undefined as any,
        minHeight: numberOfLines ? numberOfLines * 22 + 24 : 96,
        paddingVertical: 12 as any,
        textAlignVertical: 'top' as const,
      }
    : {
        height: 52 as any,
      };

  return (
    <YStack gap="$1.5">
      {label && (
        <Label fontSize={14} fontWeight="500" color="$brandText">
          {label}
        </Label>
      )}
      <StyledInput
        multiline={multiline}
        numberOfLines={numberOfLines}
        {...heightProps}
        {...props}
        borderColor={error ? '$brandError' : props.borderColor ?? '$brandBorder'}
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
