import { useContext, useState, useRef } from 'react';
import Tasks, { Task, TasksContext, UUID } from './Tasks';
import { Pressable, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { ScheduleOnceRecipe } from './TimeUtils';
import DateTimePicker from './DateTimeInputComponent';

/**
 * A component for editing {@link ScheduleOnceRecipe|ScheduleOnceRecipes} which is designed to sit inside the {@link TaskEdit} component.
 * @param options
 * @param options.recipe - The recipe to edit
 * @param options.onChange - Function to be called when the user makes a chagne to the recipe
 * @param [options.onDelete] - Function to be called when the user wishes to delete the recipe. If nothing is supplied, then this option is not provided to the user in the component
 * @returns The React Native component 
 */
function ScheduleOneRecipeEditor(
    { recipe, onChange, onDelete = null }:
    { recipe: ScheduleOnceRecipe, onChange: (val: ScheduleOnceRecipe) => void, onDelete?: () => void }
) {
    onChange = onChange ?? function(){};
    return (
    <View style={{ borderWidth: 1, margin: 5 }}>
        <Text variant='bodyMedium'>Schedule Once</Text>
        <Text>From</Text>
        <DateTimePicker value={recipe.timespan.timeFrom} onChange={(date) => {
            onChange({ ...recipe, timespan: { timeFrom: date, timeUntil: recipe.timespan.timeUntil } }) }}/>
        <Text>Until</Text>
        <DateTimePicker value={recipe.timespan.timeUntil} onChange={(date) => {
            onChange({ ...recipe, timespan: { timeFrom: recipe.timespan.timeFrom, timeUntil: date } }) }}/>
        { onDelete?
        <Button onPress={onDelete}>Delete</Button>
        : null
        }
    </View>);
}

/**
 * A component for editing {@link Task|Tasks}.
 * @param options
 * @param options.task - The task to edit
 * @param [options.disabledFields] - The fields which the user is disallowed from editing. If not specified, then defaults to none
 * @param options.onConfirm - Function to be called when the user finishes editing the task and confirms the edits staged
 * @param options.onCancel - Function to be called when the user cancels editing the task
 * @returns The task editing React Native component
 */
export default function TaskEdit(
    { task, disabledFields = [ ], onConfirm, onCancel } :
    { task: Partial<Task>, disabledFields?: (keyof Task)[],
        onConfirm: (newTask: Partial<Task>) => void, onCancel: () => void }
) {
    const [ tasks, dispatch ] = useContext(TasksContext); // for choosing parents / children
    const [ state, setState ] = useState(task);

    function addScheduleRecipe() {
        // TODO: recurring
        const ONE_HOUR = 1000*60*60;
        setState({ ...state, schedule_recipes:
            [ { type: 'single', timespan: { timeFrom: Date.now(), timeUntil: Date.now() + ONE_HOUR } },
            ...(state.schedule_recipes ?? []) ] });
    }

    const scheduleRecipeEditors = (state.schedule_recipes ?? [ ]).map((recipe, index) => {
        // TODO: recurring
        switch (recipe.type) {
            case 'single':
                return <ScheduleOneRecipeEditor recipe={recipe} key={index}
                    onChange={(new_recipe) => setState({ ...state, schedule_recipes:
                        state.schedule_recipes.map((old_recipe, i) => i == index? new_recipe : old_recipe) })}
                    onDelete={() => setState({ ...state, schedule_recipes:
                        state.schedule_recipes.filter((_, i) => i != index) })} />
        }
    });

    return (
    <View>
        <TextInput
            label={'Task Name'}
            defaultValue={ task.name }
            placeholder={ Tasks.DEFAULT_TASK.name }
            onChangeText={ (name) => setState({ ...state, name: name }) }
            mode={'outlined'}
            disabled={ disabledFields.indexOf('name') >= 0 }
        />
        <TextInput
            label={'Task Description'}
            defaultValue={ task.description }
            onChangeText={ (desc) => setState({ ...state, description: desc }) }
            mode={'outlined'}
            disabled={ disabledFields.indexOf('description') >= 0 }
        />

        <View>
            {scheduleRecipeEditors}
        </View>
        <Button onPress={addScheduleRecipe}>Create new schedule recipe</Button>

        <Button onPress={() => onConfirm(state)}>Confirm</Button>
        <Button onPress={onCancel}>Cancel</Button>
    </View>);
}