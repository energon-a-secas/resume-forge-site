// Update layout controls display values
export function updateLayoutControls(state) {
  // Column width
  const widthInput = document.getElementById('inputColumnWidth');
  const widthValue = document.getElementById('columnWidthValue');
  if (widthInput && widthValue) {
    widthInput.value = state.layout.columnWidth;
    widthValue.textContent = state.layout.columnWidth;
  }

  // Column opacity
  const opacityInput = document.getElementById('inputColumnOpacity');
  const opacityValue = document.getElementById('columnOpacityValue');
  if (opacityInput && opacityValue) {
    opacityInput.value = state.layout.columnOpacity;
    opacityValue.textContent = state.layout.columnOpacity;
  }

  // Column side radio
  const radios = document.querySelectorAll('input[name="columnSide"]');
  radios.forEach(radio => {
    radio.checked = radio.value === state.layout.columnSide;
  });

  // Column color
  const colorInput = document.getElementById('inputColumnColor');
  if (colorInput) {
    colorInput.value = state.layout.columnColor;
  }

  // Font selects
  const headingFont = document.getElementById('inputFontHeading');
  const bodyFont = document.getElementById('inputFontBody');
  if (headingFont) headingFont.value = state.fonts.heading;
  if (bodyFont) bodyFont.value = state.fonts.body;
}
