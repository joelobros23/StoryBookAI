import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// This component will not be rendered because we prevent the default tab press action.
// It's just here to satisfy the router so a tab icon is created.
// We've wrapped it in a SafeAreaView for consistency.
export default function PlayScreenPlaceholder() {
  return (
    <SafeAreaView style={styles.container}>
        <View />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212' // Matching the theme from other screens
    }
})
