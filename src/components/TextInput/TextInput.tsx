import React from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps as RNTextInputProps,
} from 'react-native';
import {SemanticColorsLight} from '@constants/tokens';
import {Typography} from '@constants/typography';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  placeholder?: string;
  error?: boolean;
  errorText?: string;
  supportingText?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  style?: 'outlined' | 'ghost';
  multiline?: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  placeholder,
  error = false,
  errorText,
  supportingText,
  leadingIcon,
  trailingIcon,
  style = 'outlined',
  multiline = false,
  value,
  ...props
}) => {
  const hasValue = value && value.length > 0;
  const isGhost = style === 'ghost';

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View
        style={[
          styles.inputContainer,
          isGhost && styles.inputContainerGhost,
          error && styles.inputContainerError,
        ]}>
        {leadingIcon && (
          <View style={styles.leadingIcon}>{leadingIcon}</View>
        )}
        <RNTextInput
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            hasValue ? styles.inputFilled : styles.inputPlaceholder,
          ]}
          placeholder={placeholder}
          placeholderTextColor={SemanticColorsLight['foreground-onsurfacemuted']}
          multiline={multiline}
          value={value}
          {...props}
        />
        {trailingIcon && (
          <View style={styles.trailingIcon}>{trailingIcon}</View>
        )}
      </View>
      {error && errorText && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorText}</Text>
        </View>
      )}
      {supportingText && !error && (
        <Text style={styles.supportingText}>{supportingText}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    ...Typography.label.medium,
    color: SemanticColorsLight['foreground-onsurfacemuted'],
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SemanticColorsLight['surface-surfacecontainer'],
    borderRadius: Radius['radius-md'],
    paddingHorizontal: Spacing.md,
    minHeight: 48,
    borderWidth: 0,
  },
  inputContainerGhost: {
    backgroundColor: 'transparent',
  },
  inputContainerError: {
    borderWidth: 1,
    borderColor: SemanticColorsLight['foreground-error'],
  },
  input: {
    flex: 1,
    ...Typography.body.medium,
    color: SemanticColorsLight['foreground-onsurface'],
    paddingVertical: Spacing.sm,
    minHeight: 24,
    outlineStyle: 'none',
  } as any,
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  inputFilled: {
    color: SemanticColorsLight['foreground-onsurface'],
  },
  inputPlaceholder: {
    color: SemanticColorsLight['foreground-onsurfacemuted'],
  },
  leadingIcon: {
    marginRight: Spacing.sm,
  },
  trailingIcon: {
    marginLeft: Spacing.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  errorText: {
    ...Typography.body.small,
    color: SemanticColorsLight['foreground-error'],
  },
  supportingText: {
    ...Typography.body.small,
    color: SemanticColorsLight['foreground-onsurfacevar'],
    marginTop: Spacing.xs,
  },
});
