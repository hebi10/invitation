type WizardTextTemplate = {
  label: string;
  value: string;
};

export function getSelectedTemplateLabel(
  templates: readonly WizardTextTemplate[],
  currentValue: string
) {
  return templates.find((template) => template.value === currentValue)?.label ?? null;
}
