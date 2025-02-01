// Import necessary functions from separate modules
import { extractVideoId, createYouTubeEmbed } from './youtube.js';
import { saveToLocalStorage, loadFromLocalStorage, saveProgress, loadProgress } from './storage.js';

// Main application state
let courses = loadFromLocalStorage('courses') || [];
let videoHistory = []; // For undo functionality
let currentCourseId = null;
let currentVideoIndex = 0;

// DOM Elements
const addCourseBtn = document.getElementById('addCourseBtn');
const addCourseModal = document.getElementById('addCourseModal');
const courseViewModal = document.getElementById('courseViewModal');
const addCourseForm = document.getElementById('addCourseForm');
const addVideoBtn = document.getElementById('addVideoBtn');
const coursesGrid = document.getElementById('coursesGrid');
const undoVideoBtn = document.getElementById('undoVideoBtn');
const dropdownContent = document.getElementById('dropdownContent');

// Expose functions to global window object
window.renderCourses = renderCourses;
window.showManageCourses = function() {
  // Ensure courses grid is ready
  renderCourses();
  
  // Switch coursesGrid to management view
  coursesGrid.innerHTML = courses.map(course => `
    <div class="course-card management-view">
      <img 
        src="${course.thumbnail || 'https://via.placeholder.com/300x200'}" 
        alt="${course.name}" 
        class="course-thumbnail"
      >
      <div class="course-info">
        <h2 class="course-title">${course.name}</h2>
        <p class="course-price">₹${course.price}</p>
        <div class="course-actions">
          <button onclick="window.editCourse(${course.id})" class="edit-btn">Edit Course</button>
          <button onclick="window.deleteCourse(${course.id})" class="delete-btn">Delete Course</button>
        </div>
      </div>
    </div>
  `).join('');

  // Add a back button at the top
  coursesGrid.insertAdjacentHTML('beforebegin', `
    <div class="management-header">
      <button onclick="window.renderCourses()" class="back-btn">← Back to Courses</button>
      <h2>Manage Courses</h2>
    </div>
  `);
};

window.addNewCourse = function() {
  const formTitle = document.getElementById('courseModalTitle');
  const submitBtn = document.getElementById('courseSubmitBtn');
  
  formTitle.textContent = 'Add New Course';
  submitBtn.textContent = 'Create Course';
  
  resetForm();
  addCourseModal.style.display = 'block';
};

window.editCourse = function(courseId) {
  const course = courses.find(c => c.id === courseId);
  if (!course) return;
  
  const formTitle = document.getElementById('courseModalTitle');
  const submitBtn = document.getElementById('courseSubmitBtn');
  
  formTitle.textContent = 'Edit Course';
  submitBtn.textContent = 'Save Changes';

  document.getElementById('courseName').value = course.name;
  document.getElementById('courseThumbnail').value = course.thumbnail || '';
  document.getElementById('upiId').value = course.upiId;
  document.getElementById('coursePrice').value = course.price;
  document.getElementById('courseId').value = course.id;
  
  const videoEntries = document.getElementById('videoEntries');
  videoEntries.innerHTML = course.videos.map((video, index) => `
    <div class="video-entry">
      <h3>Video ${index + 1}</h3>
      <input type="text" class="video-name" value="${video.name}" required>
      <input type="url" class="video-url" value="${video.url}" required>
      <button type="button" class="delete-video-btn" onclick="window.deleteVideoEntry(this)">Delete Video</button>
    </div>
  `).join('');
  
  addCourseModal.style.display = 'block';
};

window.deleteCourse = function(courseId) {
  if (confirm('Are you sure you want to delete this course?')) {
    courses = courses.filter(c => c.id !== courseId);
    saveToLocalStorage('courses', courses);
    renderCourses();
  }
};

// Event Listeners
addCourseBtn.addEventListener('click', () => {
  dropdownContent.classList.toggle('show');
});

window.onclick = function(event) {
  if (event.target === addCourseModal || event.target === courseViewModal) {
    closeAllModals();
  }
  
  // Existing dropdown toggle logic
  if (!event.target.matches('.add-btn')) {
    const dropdowns = document.getElementsByClassName('dropdown-content');
    Array.from(dropdowns).forEach(dropdown => {
      if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
      }
    });
  }
};

document.querySelectorAll('.close-btn').forEach(btn => {
  btn.addEventListener('click', closeAllModals);
});

// Close modal when clicking outside
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeAllModals();
  }
});

addVideoBtn.addEventListener('click', addVideoEntry);
undoVideoBtn.addEventListener('click', undoVideoEntry);
addCourseForm.addEventListener('submit', handleCourseSubmit);

// Initialize the application
renderCourses();

function closeAllModals() {
  const addCourseModal = document.getElementById('addCourseModal');
  const courseViewModal = document.getElementById('courseViewModal');
  
  addCourseModal.style.display = 'none';
  courseViewModal.style.display = 'none';
  
  // Stop the YouTube video when closing the modal
  const videoPlayer = document.querySelector('.video-player');
  if (videoPlayer) {
    const iframe = videoPlayer.querySelector('iframe');
    if (iframe) {
      // Use postMessage to stop the video
      iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      iframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
    }
    // Clear the video player
    videoPlayer.innerHTML = '';
  }
  
  resetForm();
}

function resetForm() {
  addCourseForm.reset();
  document.getElementById('videoEntries').innerHTML = `
    <div class="video-entry">
      <h3>Video 1</h3>
      <input type="text" class="video-name" placeholder="Video Name" required>
      <input type="url" class="video-url" placeholder="YouTube Video URL" required>
    </div>
  `;
  videoHistory = [];
  document.getElementById('courseId').value = '';
}

function addVideoEntry() {
  const videoEntries = document.getElementById('videoEntries');
  const currentState = videoEntries.innerHTML;
  videoHistory.push(currentState);
  
  const newEntry = document.createElement('div');
  newEntry.className = 'video-entry';
  const videoCount = videoEntries.children.length + 1;
  
  newEntry.innerHTML = `
    <h3>Video ${videoCount}</h3>
    <input type="text" class="video-name" placeholder="Video Name" required>
    <input type="url" class="video-url" placeholder="YouTube Video URL" required>
    <button type="button" class="delete-video-btn" onclick="window.deleteVideoEntry(this)">Delete Video</button>
  `;
  
  videoEntries.appendChild(newEntry);
  undoVideoBtn.disabled = false;
}

function undoVideoEntry() {
  if (videoHistory.length > 0) {
    const previousState = videoHistory.pop();
    document.getElementById('videoEntries').innerHTML = previousState;
    if (videoHistory.length === 0) {
      undoVideoBtn.disabled = true;
    }
  }
}

function handleCourseSubmit(e) {
  e.preventDefault();
  
  const courseName = document.getElementById('courseName').value;
  const upiId = document.getElementById('upiId').value;
  const coursePrice = document.getElementById('coursePrice').value;
  const courseId = document.getElementById('courseId').value;
  const courseThumbnail = document.getElementById('courseThumbnail').value;
  
  const videos = Array.from(document.getElementsByClassName('video-entry'))
    .filter(entry => !entry.classList.contains('deleted'))
    .map(entry => ({
      name: entry.querySelector('.video-name').value,
      url: entry.querySelector('.video-url').value
    }));
  
  if (courseId) {
    // Edit existing course
    const courseIndex = courses.findIndex(c => c.id.toString() === courseId);
    if (courseIndex !== -1) {
      courses[courseIndex] = {
        ...courses[courseIndex],
        name: courseName,
        thumbnail: courseThumbnail,
        videos,
        upiId,
        price: coursePrice
      };
    }
  } else {
    // Add new course
    const newCourse = {
      id: Date.now(),
      name: courseName,
      thumbnail: courseThumbnail,
      videos,
      upiId,
      price: coursePrice
    };
    courses.push(newCourse);
  }
  
  saveToLocalStorage('courses', courses);
  renderCourses();
  closeAllModals();
}

function deleteVideoEntry(button) {
  const videoEntry = button.parentElement;
  const videoEntries = videoEntry.parentElement;
  
  if (videoEntries.children.length <= 1) {
    alert('Cannot delete the last video entry. A course must have at least one video.');
    return;
  }
  
  videoEntry.classList.add('deleted');
  videoEntry.style.display = 'none';
  
  // Renumber remaining visible video entries
  const visibleEntries = Array.from(videoEntries.children).filter(entry => !entry.classList.contains('deleted'));
  visibleEntries.forEach((entry, index) => {
    entry.querySelector('h3').textContent = `Video ${index + 1}`;
  });
};

function updateProgressBar(course) {
  const progress = loadProgress(course.id);
  const progressPercentage = (progress.length / course.videos.length) * 100;
  return progressPercentage;
}

function renderCourses() {
  const managementHeader = document.querySelector('.management-header');
  if (managementHeader) {
    managementHeader.remove();
  }
  
  coursesGrid.innerHTML = courses.map(course => {
    const progressPercentage = updateProgressBar(course);
    
    // Properly escape the course name for use in SVG
    const escapedName = course.name.replace(/[<>&"']/g, c => {
      return {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;'
      }[c];
    });
    
    const thumbnailHtml = course.thumbnail ? 
      `<img src="${course.thumbnail}" alt="${escapedName}" class="course-thumbnail" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=&quot;course-thumbnail-fallback&quot;>${escapedName}</div>'">` :
      `<div class="course-thumbnail-fallback">${escapedName}</div>`;
    
    return `
      <div class="course-card" onclick="window.viewCourse(${course.id})">
        <div style="position: relative;">
          ${thumbnailHtml}
          <div class="progress-bar" style="width: ${progressPercentage}%"></div>
        </div>
        <div class="course-info">
          <h2 class="course-title">${escapedName}</h2>
          <p class="course-price">₹${course.price}</p>
        </div>
      </div>
    `;
  }).join('');
}

window.viewCourse = function(courseId) {
  const course = courses.find(c => c.id === courseId);
  if (!course) return;
  
  currentCourseId = courseId;
  currentVideoIndex = 0;
  const progress = loadProgress(courseId);
  
  const courseViewContent = document.getElementById('courseViewContent');
  courseViewContent.innerHTML = `
    <div class="course-header">
      <h2>${course.name}</h2>
    </div>
    <div class="video-player-container">
      <div class="video-player">
        ${createYouTubeEmbed(course.videos[0].url)}
      </div>
    </div>
    <div class="video-navigation">
      <button onclick="window.previousVideo()" class="nav-btn" id="prevBtn" disabled>← Previous</button>
      <button onclick="window.markVideoComplete()" class="mark-complete-btn" id="markCompleteBtn">
        Mark as Complete
      </button>
      <button onclick="window.nextVideo()" class="nav-btn" id="nextBtn">Next →</button>
    </div>
    <div class="video-list">
      ${course.videos.map((video, index) => `
        <div class="video-item ${index === 0 ? 'active' : ''} ${progress.includes(index) ? 'completed' : ''}" 
             onclick="window.changeVideo(this, '${video.url}', ${index})">
          <span>${index + 1}. ${video.name}</span>
          <span class="completion-indicator">✓</span>
        </div>
      `).join('')}
    </div>
    <div class="payment-info">
      <h3>Purchase this course</h3>
      <p>Price: ₹${course.price}</p>
      <p>UPI ID: ${course.upiId}</p>
      <p>After payment, send your transaction screenshot and email to support@internforage.com</p>
    </div>
  `;
  
  courseViewModal.style.display = 'block';
  updateNavigationButtons();
  updateMarkCompleteButton();
};

window.toggleLights = function() {
  const courseViewModal = document.getElementById('courseViewModal');
  const courseView = courseViewModal.querySelector('.course-view');
  const videoPlayerContainer = document.querySelector('.video-player-container');

  if (!courseView.classList.contains('lights-off')) {
    courseView.classList.add('lights-off');
    videoPlayerContainer.insertAdjacentHTML('afterbegin', `
      <button onclick="window.toggleLights()" class="lights-toggle lights-btn">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z"/>
        </svg>
        Lights On
      </button>
    `);
  } else {
    courseView.classList.remove('lights-off');
    const lightsToggle = document.querySelector('.lights-toggle');
    if (lightsToggle) {
      lightsToggle.remove();
    }
  }
};

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const sunIcon = document.querySelector('.sun-icon');
  const moonIcon = document.querySelector('.moon-icon');
  const themeText = document.querySelector('.theme-text');
  
  if (theme === 'dark') {
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
    themeText.textContent = 'Light Mode';
  } else {
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
    themeText.textContent = 'Dark Mode';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  const themeToggle = document.getElementById('themeToggle');
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
  });
  
  const resizableElements = document.querySelectorAll('.resizable');
  
  resizableElements.forEach(element => {
    const resizeHandles = element.querySelectorAll('.resize-handle');
    
    resizeHandles.forEach(handle => {
      handle.addEventListener('mousedown', initResize);
    });
  });
});

function initResize(e) {
  e.preventDefault();
  const resizeHandle = e.target;
  const resizableElement = resizeHandle.closest('.resizable');
  const direction = resizeHandle.classList.contains('resize-handle-top') ? 'top' :
                    resizeHandle.classList.contains('resize-handle-right') ? 'right' :
                    resizeHandle.classList.contains('resize-handle-bottom') ? 'bottom' :
                    'left';
  
  const startX = e.clientX;
  const startY = e.clientY;
  const startWidth = resizableElement.offsetWidth;
  const startHeight = resizableElement.offsetHeight;
  const startLeft = resizableElement.offsetLeft;
  const startTop = resizableElement.offsetTop;

  function doResize(e) {
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    switch(direction) {
      case 'top':
        resizableElement.style.height = `${startHeight - deltaY}px`;
        resizableElement.style.top = `${startTop + deltaY}px`;
        break;
      case 'right':
        resizableElement.style.width = `${startWidth + deltaX}px`;
        break;
      case 'bottom':
        resizableElement.style.height = `${startHeight + deltaY}px`;
        break;
      case 'left':
        resizableElement.style.width = `${startWidth - deltaX}px`;
        resizableElement.style.left = `${startLeft + deltaX}px`;
        break;
    }
  }

  function stopResize() {
    document.removeEventListener('mousemove', doResize);
    document.removeEventListener('mouseup', stopResize);
  }

  document.addEventListener('mousemove', doResize);
  document.addEventListener('mouseup', stopResize);
}

window.changeVideo = function(element, videoUrl, index) {
  const videoPlayer = document.querySelector('.video-player');
  videoPlayer.innerHTML = createYouTubeEmbed(videoUrl);
  
  document.querySelectorAll('.video-item').forEach(item => item.classList.remove('active'));
  element.classList.add('active');
  
  currentVideoIndex = index;
  updateNavigationButtons();
  updateMarkCompleteButton();
};

window.previousVideo = function() {
  if (currentVideoIndex > 0) {
    const videos = document.querySelectorAll('.video-item');
    videos[currentVideoIndex - 1].click();
  }
};

window.nextVideo = function() {
  const course = courses.find(c => c.id === currentCourseId);
  if (currentVideoIndex < course.videos.length - 1) {
    const videos = document.querySelectorAll('.video-item');
    videos[currentVideoIndex + 1].click();
  }
};

window.markVideoComplete = function() {
  const progress = loadProgress(currentCourseId);
  const index = progress.indexOf(currentVideoIndex);
  
  if (index === -1) {
    progress.push(currentVideoIndex);
  } else {
    progress.splice(index, 1);
  }
  
  saveProgress(currentCourseId, progress);
  
  const videoItems = document.querySelectorAll('.video-item');
  videoItems[currentVideoIndex].classList.toggle('completed');
  
  updateMarkCompleteButton();
  renderCourses(); // Update progress bar on course card
};

function updateNavigationButtons() {
  const course = courses.find(c => c.id === currentCourseId);
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  prevBtn.disabled = currentVideoIndex === 0;
  nextBtn.disabled = currentVideoIndex === course.videos.length - 1;
}

function updateMarkCompleteButton() {
  const progress = loadProgress(currentCourseId);
  const markCompleteBtn = document.getElementById('markCompleteBtn');
  const isCompleted = progress.includes(currentVideoIndex);
  
  markCompleteBtn.textContent = isCompleted ? 'Mark as Incomplete' : 'Mark as Complete';
  markCompleteBtn.classList.toggle('completed', isCompleted);
}