import { state } from './state.js';
import { triggerSave } from './app.js';
import { generateId } from './utils.js';

// Render personal inputs
export function renderPersonalInputs() {
  document.getElementById('inputName').value = state.name;
  document.getElementById('inputTitle').value = state.title;
  document.getElementById('inputLocation').value = state.location;
  document.getElementById('inputEmail').value = state.email;
  document.getElementById('inputPhone').value = state.phone;
  document.getElementById('inputLinkedin').value = state.linkedin;
  document.getElementById('inputGithub').value = state.github;
  document.getElementById('inputWebsite').value = state.website;
  document.getElementById('inputLinktree').value = state.linktree;
  document.getElementById('inputTwitter').value = state.twitter;
  document.getElementById('inputSummary').value = state.summary;
}

// Render experience list
export function renderExperienceList() {
  const container = document.getElementById('experienceList');
  container.innerHTML = state.experience.map((exp, idx) => `
    <div class="item-card" data-idx="${idx}">
      <div class="item-header">
        <span>${exp.company || 'Untitled'}</span>
        <button class="btn-remove" onclick="window.removeExperience(${idx})">Remove</button>
      </div>
      <div class="form-group">
        <input type="text" placeholder="Company" value="${exp.company}" onchange="window.updateExperience(${idx}, 'company', this.value)">
      </div>
      <div class="form-group">
        <input type="text" placeholder="Role" value="${exp.role}" onchange="window.updateExperience(${idx}, 'role', this.value)">
      </div>
      <div class="form-row">
        <div class="form-group">
          <input type="text" placeholder="Dates" value="${exp.dates}" onchange="window.updateExperience(${idx}, 'dates', this.value)">
        </div>
        <div class="form-group">
          <input type="text" placeholder="Location" value="${exp.location}" onchange="window.updateExperience(${idx}, 'location', this.value)">
        </div>
      </div>
      <div class="form-group">
        <textarea placeholder="Description" rows="3" onchange="window.updateExperience(${idx}, 'description', this.value)">${exp.description}</textarea>
      </div>
    </div>
  `).join('');
}

// Render skills list
export function renderSkillsList() {
  const container = document.getElementById('skillsList');
  container.innerHTML = state.skills.map((skill, idx) => `
    <div class="item-card" data-idx="${idx}">
      <div class="item-header">
        <span>${skill.name || 'Untitled'}</span>
        <button class="btn-remove" onclick="window.removeSkill(${idx})">Remove</button>
      </div>
      <div class="form-group">
        <input type="text" placeholder="Skill name" value="${skill.name}" onchange="window.updateSkill(${idx}, 'name', this.value)">
      </div>
      <div class="form-group">
        <label>Rating</label>
        <div class="skill-rating" role="radiogroup" aria-label="${(skill.name || 'Skill')} rating, ${skill.hearts} of 5">
          ${[1,2,3,4,5].map(h => `
            <svg class="heart-icon ${h <= skill.hearts ? 'filled' : 'empty'}" viewBox="0 0 24 24" role="radio" tabindex="0" aria-label="Rate ${h} of 5" aria-checked="${h === skill.hearts ? 'true' : 'false'}" onclick="window.setSkillRating(${idx}, ${h})" onkeydown="window.handleHeartKey(event, ${idx}, ${h})">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          `).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

// Render education list
export function renderEducationList() {
  const container = document.getElementById('educationList');
  container.innerHTML = state.education.map((edu, idx) => `
    <div class="item-card" data-idx="${idx}">
      <div class="item-header">
        <span>${edu.school || 'Untitled'}</span>
        <button class="btn-remove" onclick="window.removeEducation(${idx})">Remove</button>
      </div>
      <div class="form-group">
        <input type="text" placeholder="School" value="${edu.school}" onchange="window.updateEducation(${idx}, 'school', this.value)">
      </div>
      <div class="form-group">
        <input type="text" placeholder="Degree" value="${edu.degree}" onchange="window.updateEducation(${idx}, 'degree', this.value)">
      </div>
      <div class="form-row">
        <div class="form-group">
          <input type="text" placeholder="Dates" value="${edu.dates}" onchange="window.updateEducation(${idx}, 'dates', this.value)">
        </div>
        <div class="form-group">
          <input type="text" placeholder="Location" value="${edu.location}" onchange="window.updateEducation(${idx}, 'location', this.value)">
        </div>
      </div>
    </div>
  `).join('');
}

// Render languages list
export function renderLanguagesList() {
  const container = document.getElementById('languagesList');
  container.innerHTML = state.languages.map((lang, idx) => `
    <div class="item-card" data-idx="${idx}">
      <div class="item-header">
        <span>${lang.name || 'Untitled'}</span>
        <button class="btn-remove" onclick="window.removeLanguage(${idx})">Remove</button>
      </div>
      <div class="form-row">
        <div class="form-group">
          <input type="text" placeholder="Language" value="${lang.name}" onchange="window.updateLanguage(${idx}, 'name', this.value)">
        </div>
        <div class="form-group">
          <input type="text" placeholder="Level" value="${lang.level}" onchange="window.updateLanguage(${idx}, 'level', this.value)">
        </div>
      </div>
    </div>
  `).join('');
}

// Add new experience
export function addExperience() {
  state.experience.push({
    company: '',
    role: '',
    dates: '',
    location: '',
    description: '',
  });
  renderExperienceList();
  triggerSave();
}

// Update experience field
export function updateExperience(idx, field, value) {
  if (state.experience[idx]) {
    state.experience[idx][field] = value;
    triggerSave();
  }
}

// Remove experience
export function removeExperience(idx) {
  state.experience.splice(idx, 1);
  renderExperienceList();
  triggerSave();
}

// Add new skill
export function addSkill() {
  state.skills.push({
    name: '',
    hearts: 3,
    category: 'technical',
  });
  renderSkillsList();
  triggerSave();
}

// Update skill field
export function updateSkill(idx, field, value) {
  if (state.skills[idx]) {
    state.skills[idx][field] = value;
    triggerSave();
  }
}

// Set skill rating
export function setSkillRating(idx, hearts) {
  if (state.skills[idx]) {
    state.skills[idx].hearts = hearts;
    renderSkillsList();
    triggerSave();
  }
}

// Keyboard activation for heart rating (Enter/Space)
export function handleHeartKey(event, idx, hearts) {
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault();
    setSkillRating(idx, hearts);
  }
}

// Remove skill
export function removeSkill(idx) {
  state.skills.splice(idx, 1);
  renderSkillsList();
  triggerSave();
}

// Add new education
export function addEducation() {
  state.education.push({
    school: '',
    degree: '',
    dates: '',
    location: '',
  });
  renderEducationList();
  triggerSave();
}

// Update education field
export function updateEducation(idx, field, value) {
  if (state.education[idx]) {
    state.education[idx][field] = value;
    triggerSave();
  }
}

// Remove education
export function removeEducation(idx) {
  state.education.splice(idx, 1);
  renderEducationList();
  triggerSave();
}

// Add new language
export function addLanguage() {
  state.languages.push({
    name: '',
    level: '',
  });
  renderLanguagesList();
  triggerSave();
}

// Update language field
export function updateLanguage(idx, field, value) {
  if (state.languages[idx]) {
    state.languages[idx][field] = value;
    triggerSave();
  }
}

// Remove language
export function removeLanguage(idx) {
  state.languages.splice(idx, 1);
  renderLanguagesList();
  triggerSave();
}

// Expose functions to window for inline handlers
window.updateExperience = updateExperience;
window.removeExperience = removeExperience;
window.updateSkill = updateSkill;
window.setSkillRating = setSkillRating;
window.handleHeartKey = handleHeartKey;
window.removeSkill = removeSkill;
window.updateEducation = updateEducation;
window.removeEducation = removeEducation;
window.updateLanguage = updateLanguage;
window.removeLanguage = removeLanguage;
