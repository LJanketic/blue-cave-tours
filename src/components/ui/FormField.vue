<script setup lang="ts">
/*
 * The island twin of ui/FormField.astro: same classes, same stylesheet.
 * v-model binds the value; extra attributes (type, autocomplete, maxlength…)
 * go to the control. class and style go to the wrapper, so a layout class
 * (flow__full) lands on the grid item, as it does in FormField.astro.
 */
import { computed, useAttrs } from 'vue';
import '../../styles/components/form-field.css';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();
const wrapperAttrs = computed(() => ({ class: attrs.class, style: attrs.style }));
const controlAttrs = computed(() => {
	const { class: _class, style: _style, ...rest } = attrs;
	return rest;
});

const props = withDefaults(
	defineProps<{
		label: string;
		name: string;
		id?: string;
		as?: 'input' | 'textarea' | 'select';
		options?: { value: string; label: string }[];
		hint?: string;
		error?: string;
		required?: boolean;
	}>(),
	{ id: undefined, as: 'input', options: () => [], hint: undefined, error: undefined, required: false },
);

const model = defineModel<string>({ default: '' });
const fieldId = computed(() => props.id ?? props.name);
const hintId = computed(() => (props.hint ? `${fieldId.value}-hint` : undefined));
const errorId = computed(() => (props.error ? `${fieldId.value}-error` : undefined));
const describedBy = computed(() => [hintId.value, errorId.value].filter(Boolean).join(' ') || undefined);
</script>

<template>
	<div class="form-field-ui" v-bind="wrapperAttrs">
		<label class="form-field-ui__label" :for="fieldId">
			{{ label }}<span v-if="required" class="form-field-ui__required" aria-hidden="true">*</span>
		</label>
		<textarea
			v-if="as === 'textarea'"
			:id="fieldId"
			v-model="model"
			v-bind="controlAttrs"
			:name="name"
			:required="required"
			class="form-field-ui__control"
			:aria-describedby="describedBy"
			:aria-invalid="error ? 'true' : undefined"
		></textarea>
		<select
			v-else-if="as === 'select'"
			:id="fieldId"
			v-model="model"
			v-bind="controlAttrs"
			:name="name"
			:required="required"
			class="form-field-ui__control"
			:aria-describedby="describedBy"
			:aria-invalid="error ? 'true' : undefined"
		>
			<option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
		</select>
		<input
			v-else
			:id="fieldId"
			v-model="model"
			v-bind="controlAttrs"
			:name="name"
			:required="required"
			class="form-field-ui__control"
			:aria-describedby="describedBy"
			:aria-invalid="error ? 'true' : undefined"
		/>
		<p v-if="hint" :id="hintId" class="form-field-ui__hint">{{ hint }}</p>
		<p v-if="error" :id="errorId" class="form-field-ui__error">
			<i class="ti ti-alert-circle" aria-hidden="true"></i>
			{{ error }}
		</p>
	</div>
</template>
