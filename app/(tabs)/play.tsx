import React from 'react';
import { View } from 'react-native';

// This component will not be rendered because we prevent the default tab press action.
// It's just here to satisfy the router so a tab icon is created.
export default function PlayScreenPlaceholder() {
  return <View />;
}
