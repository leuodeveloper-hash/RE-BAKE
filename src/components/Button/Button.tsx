import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {Colors} from '@constants/colors';
import {Typography} from '@constants/typography';
import {Spacing} from '@constants/spacing';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.paddingHorizontal = Spacing.md;
        baseStyle.paddingVertical = Spacing.sm;
        break;
      case 'medium':
        baseStyle.paddingHorizontal = Spacing.lg;
        baseStyle.paddingVertical = Spacing.md;
        break;
      case 'large':
        baseStyle.paddingHorizontal = Spacing.xl;
        baseStyle.paddingVertical = Spacing.lg;
        break;
    }

    // Variant styles
    switch (variant) {
      case 'primary':
        baseStyle.backgroundColor = Colors.primary;
        break;
      case 'secondary':
        baseStyle.backgroundColor = Colors.secondary;
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = Colors.primary;
        break;
    }

    if (disabled || loading) {
      baseStyle.opacity = 0.5;
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      ...Typography.button,
    };

    switch (size) {
      case 'small':
        baseStyle.fontSize = Typography.buttonSmall.fontSize;
        break;
      case 'large':
        baseStyle.fontSize = Typography.buttonLarge.fontSize;
        break;
    }

    switch (variant) {
      case 'primary':
      case 'secondary':
        baseStyle.color = Colors.white;
        break;
      case 'outline':
        baseStyle.color = Colors.primary;
        break;
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}>
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' ? Colors.primary : Colors.white}
          style={styles.loader}
        />
      )}
      <Text style={[getTextStyle(), textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  loader: {
    marginRight: Spacing.sm,
  },
});
