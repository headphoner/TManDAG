import { useContext } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * The standard stylings for the app
 */
export default StyleSheet.create({
    container: {
        padding: 7.5,
        margin: 2,
        gap: 5,
        color: 'black',
        borderColor: 'black'
    },
    verticalFlexContainer: {
        flex: 1,
        flexDirection: 'column'
    },
    horizontalFlexContainer: {
        flex: 1,
        flexDirection: 'row',
        gap: 5
    },
    centeredContent: {
        alignContent: 'center',
        alignItems: 'center',
        justifyContent: 'center'
    },
    roundedBorder: {
        borderWidth: 2,
        borderRadius: 15,
        borderCurve: 'circular',
    },
    rectBorder: {
        borderWidth: 2
    },
    headerText: {
        fontSize: 40,
        fontWeight: 'bold'
    },
    largeText: {
        fontSize: 15,
        fontWeight: 'bold'
    },
    smallText: {
        fontSize: 10,
        fontWeight: 'normal'
    }
});

/**
 * A React Native component which represents a thin horizontal line
 * @returns The React Native component
 */
export function ThinLine(): React.JSX.Element {
    return <View style={{ alignSelf: 'stretch', borderBottomColor: 'inherit', borderBottomWidth: StyleSheet.hairlineWidth }}/>;
}

/**
 * Function to get text for a date label
 * @param time - The time to display, in milliseconds since Unix epoch (1 Jan 1970, UTC)
 * @returns A formatted string of the day, month, and year indicated by `time` in the default timezone
 */
export function getDateLabelText(time: number) {
    let d = new Date(time);
    const months = {
        0: 'Jan',
        1: 'Feb',
        2: 'Mar',
        3: 'Apr',
        4: 'May',
        5: 'Jun',
        6: 'Jul',
        7: 'Aug',
        8: 'Sep',
        9: 'Oct',
        10: 'Nov',
        11: 'Dec'
    };
    let day: string = d.getDate().toString();
    let month: string = months[d.getMonth()];
    let year: string = d.getFullYear().toString();
    return day + " " + month + " " + year;
}

/**
 * Function to get text for a time label
 * @param time - The time to display, in milliseconds since Unix epoch (1 Jan 1970, UTC)
 * @returns A formatted string of the hour and minutes indicated by `time` in the default timezone
 */
export function getTimeLabel(time: number) {
    let d = new Date(time);
    let hour: string = d.getHours().toString();
    if (hour.length == 1) hour = "0" + hour;
    let minute: string = d.getMinutes().toString();
    if (minute.length == 1) minute = "0" + minute;
    return hour + ":" + minute;
}