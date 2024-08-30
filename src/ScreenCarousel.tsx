import { useState } from 'react';
import { SafeAreaView, View, Pressable } from 'react-native';
import styles from './StandardUI';

/**
 * A React Native component which allows the user to select between different screens
 * @param options
 * @param options.screens - List of screen elements that the user may choose to display
 * @param options.screenSelectorLabels - List of labels for each screen that the user sees to select them.
 * The indices for the relevant labels should align with the corresponding element of `options.screens`
 * @param options.defaultScreenIndex - The index of the default screen in `options.screens`
 * @returns The carousel React Native component
 */
export default function ScreenCarousel(
    { screens, screenSelectorLabels, defaultScreenIndex }:
    {
        screens: React.JSX.Element[],
        screenSelectorLabels: React.JSX.Element[],
        defaultScreenIndex: number
    }
): React.JSX.Element {

    const [ selectedIndex, setSelectedIndex ] = useState(defaultScreenIndex);

    let elements = screens.map(
        (screen, ind) => <View key={ind} style={{ flex: 1, display: (selectedIndex == ind ? 'flex' : 'none') }}>{screen}</View>
    );

    let selectors = screenSelectorLabels.map((label, ind) =>
        <Pressable
            style={[{
                flex: 1,
                height: '100%',
                alignItems: 'center',
                minHeight: 30,
                backgroundColor: ind == selectedIndex? 'gray' : null
            }]}
            key={ind}
            onPress={() => setSelectedIndex(ind)}
        >
            {label}
        </Pressable>
    );


    return (
    <SafeAreaView style={styles.verticalFlexContainer}>
        <View style={{ flex: 50 }}>{elements}</View>
        <View style={[ styles.horizontalFlexContainer, { padding: 5, justifyContent: 'space-evenly' } ]}>{selectors}</View>
    </SafeAreaView>);
}