import React, { useContext } from 'react';
import { View, Pressable, TouchableWithoutFeedback, ColorValue } from 'react-native';
import Tasks, { TaskStore, UUID, TasksContext } from './Tasks';
import { Svg, Line } from 'react-native-svg';
import { Text } from 'react-native-paper';
import constants from '../constants.json';
import styles from './StandardUI';

/**
 * A React Native component which display a collection of tasks in a dependency graph.
 * @param options
 * @param options.tasks - The tasks to display
 * @param [options.highlights] - Dictionary of UUIDs for tasks to which color they should be highlighted. Uses default color if missing from `options.highlights`
 * @param [options.onTaskPress] - Function which is called when a task in the graph is pressed on (or clicked)
 * @param [options.onBackgroundPress] - Function which is called when the background of the component is press on (or clicked)
 * @returns The dependency graph component
 */
export default function TaskGraphComponent(
    { tasks, highlights = { }, onTaskPress = function(){}, onBackgroundPress = function(){} }:
    {
        tasks: TaskStore,
        highlights?: { [key: UUID]: ColorValue },
        onTaskPress?: (task: UUID) => void,
        onBackgroundPress?: () => void
    }
): React.JSX.Element {

    let roots: UUID[];
    let depths: { [index: UUID]: number };
    let maxDepth;
    {
        // BFS to find depth
        // depth level is the last time BFS finds the node
        roots = Object.keys(tasks).filter((uuid) => tasks[uuid].parents.length == 0);;
        depths = { };
        let explored = new Set<UUID>();
        let toExplore = [ ...roots ];
        for (maxDepth = 0; toExplore.length > 0; maxDepth++) {
            let newExplore = [ ];

            for (let uuid of toExplore) {
                depths[uuid] = maxDepth;
                if (!explored.has(uuid)) {
                    explored.add(uuid);
                    newExplore.push(...tasks[uuid].children);
                }
            }

            toExplore = newExplore;
        }
    }

    let vertexLocations: { [index: UUID]: { x: number, y: number } };
    let vertices: JSX.Element[];
    {

        function VertexElement({ uuid, x, y }: { uuid: UUID, x: number, y: number }) {
            return <Pressable onPress={() => onTaskPress(uuid)}><View
                key={uuid}
                style={{
                    position: 'absolute',
                    top: vertexLocations[uuid].y,
                    left: vertexLocations[uuid].x
                }}
            >
                <View style={[
                    styles.centeredContent,
                    styles.rectBorder,
                    { 'backgroundColor': (uuid in highlights) ? highlights[uuid] : constants.task_graph.def_color }
                ]}>
                    <Text variant="labelMedium">{tasks[uuid].name}</Text>
                </View>
            </View></Pressable>;
        }

        // populate vertices using depth information
        vertexLocations = { };
        vertices = [ ];

        // first, we need to get the orderings
        // we will track the 'current' x-axis spot for each depth level
        let curRightmostAtDepth: number[] = new Array(maxDepth+1).fill(20);
        for (let uuid in tasks) {
            let depth = depths[uuid];
            vertexLocations[uuid] = { 'x': curRightmostAtDepth[depth], 'y': depth*150 };
            curRightmostAtDepth[depth] += 150;

            vertices.push(<VertexElement key={uuid} uuid={uuid} x={vertexLocations[uuid].x} y={vertexLocations[uuid].y} />);
        }
    }


    let edges: JSX.Element[] = [ ];
    {
        // populate edges
        for (let uuid in tasks) {
            for (let child_uuid of tasks[uuid].children) {
                // create an edge from parent to child
                let p_pos = vertexLocations[uuid];
                let c_pos = vertexLocations[child_uuid];
                edges.push(
                <Line
                    key={uuid.toString() + "-" + child_uuid.toString()}
                    x1={p_pos.x} y1={p_pos.y}
                    x2={c_pos.x} y2={c_pos.y}
                    stroke='red'
                />);
            }
        }
    }

    // TODO: replace 5000 with either viewport dims or parent component dims
    // TODO: make scrollable in both directions
    return (
    <TouchableWithoutFeedback onPress={onBackgroundPress}>
        <View style={{ flex: 1 }}>
            <Svg width={5000} height={5000} style={{ position: 'absolute', top: 0, left: 0 }}>
                {edges}
            </Svg>
            { vertices }
        </View>
    </TouchableWithoutFeedback>);
}