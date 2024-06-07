'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  pathLines = [];

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  // This method is called when the user clicks on the workout
  // NOT real purpose just to check prototype inheritance.
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km/_
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

///////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const formButtons = document.querySelectorAll('.form__buttons');
const edit = document.querySelector('.edit-btn');
const deleteWork = document.querySelector('.delete-btn');
const deleteAll = document.querySelector('.delete-all-btn');
const cancel = document.querySelector('.cancel-btn');
const sort = document.querySelector('.sort-btn');
const srtButtons = document.querySelectorAll('.srt');
const drawLines = document.querySelector('.draw-lines');
const saveButton = document.querySelector('.save');
const step1 = document.querySelector('.step1');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markers = [];
  #sortAscending = true;
  #activeWorkoutId;

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    // hide the buttons
    formButtons.forEach(btn => (btn.style.display = 'none'));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get the position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    if (!this.#mapEvent) return;

    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    //set local storage to save data
    this._setLocalStorage();

    // Add or hide a message
    console.log(this.#workouts);
    if (this.#workouts.length > 0) {
      step1.style.display = 'none';
    }
    if (this.#workouts.length === 1) {
      setTimeout(() => {
        console.log('2 sec passed');
        step1.style.display = 'flex';
        step1.textContent =
          'You Can Also Choose Each Workout For Additional Functionality! 🏃🏻‍♂️🚴';
      }, 2000);
      setTimeout(() => {
        step1.style.display = 'none';
      }, 16000);
    }
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃🏻‍♂️' : '🚴🏻'} ${workout.description}`
      )
      .openPopup();
    // When you create a marker, store it in an object with the workout ID as the key
    this.#markers[workout.id] = L.marker(workout.coords).addTo(this.#map);
  }

  _renderWorkout(workout) {
    let html = `
  <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃🏻‍♂️' : '🚴🏻'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;
    if (workout.type === 'running')
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
       </div>
       <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
        </div>
        </li>`;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>`;

    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    if (!this.#map) return;
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // hide the message
    step1.style.display = 'none';

    this._chosenWorkout(workout.id);
    this._renderPathLines(workout.id);
  }
  _chosenWorkout(workoutId) {
    if (!workoutId) return;
    // find the workout in the array
    const workout = this.#workouts.find(work => work.id === workoutId);

    // select the element of the workout
    const workoutEl = document.querySelector(
      `.workout[data-id="${workoutId}"]`
    );
    // show the buttons
    formButtons.forEach(btn => (btn.style.display = 'flex'));
    edit.addEventListener('click', this._edit.bind(this, workoutId));
    // prettier-ignore
    deleteWork.addEventListener('click',this._deleteWorkout.bind(this, workoutId)
    );
    deleteAll.addEventListener('click', this._deleteAll.bind(this));
    cancel.addEventListener('click', this._cancel.bind(this));
    sort.addEventListener('click', this._sortWorkouts.bind(this));
    // prettier-ignore
    drawLines.addEventListener('click', this._drawWorkoutsLines.bind(this, workoutId));
    workout.click();
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    // Restore the prototype chain
    this.#workouts = data.map(workoutData =>
      Object.assign(new Workout(), workoutData)
    );

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });

    // Check if any workout exists
    console.log(this.#workouts);
    if (this.#workouts.length > 0) {
      step1.style.display = 'none';
    }
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _edit(workoutId) {
    // select the element of the workout
    // find the workout in the array
    const workout = this.#workouts.find(work => work.id === workoutId);
    if (!workout) return; // Guard clause

    // select the element of the workout
    const workoutEl = document.querySelector(
      `.workout[data-id="${workoutId}"]`
    );

    this.#workouts.splice(this.#workouts.indexOf(workout), 1);
    workoutEl.style.display = 'none';

    // show form and fill the form with the data of the workout
    this._showForm();
    inputType.value = workout.type;
    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;
    inputCadence.value = workout.cadence ?? '';
    inputElevation.value = workout.elevationGain ?? '';

    // save the new values to the workout

    // add the event listener to the form
    form.removeEventListener('submit', this._newWorkout.bind(this));
    form.removeEventListener('submit', this._addEditedWorkout); // Remove existing listener

    // Add the new listener
    form.addEventListener('submit', this._addEditedWorkout.bind(this, workout));
  }
  _addEditedWorkout(workout, e) {
    e.preventDefault();

    // Get the updated data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const cadence = +inputCadence.value;
    const elevation = +inputElevation.value;

    // Validate the data from the form
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    //////////// BUG FIX THIS, check how creation of new workout is done.

    // Update the workout object with new data
    workout.type = type;
    workout.distance = distance;
    workout.duration = duration;

    if (
      (type === 'running' &&
        (!validInputs(distance, duration, cadence) ||
          !allPositive(distance, duration, cadence))) ||
      (type === 'cycling' &&
        (!validInputs(distance, duration, elevation) ||
          !allPositive(distance, duration)))
    ) {
      return alert('Inputs have to be positive numbers!');
    }

    // Create new workout object based on the updated data
    let updatedWorkout;
    if (type === 'running') {
      updatedWorkout = new Running(workout.coords, distance, duration, cadence);
    }

    if (type === 'cycling') {
      updatedWorkout = new Cycling(
        workout.coords,
        distance,
        duration,
        elevation
      );
    }

    // Keep the same id and date as the original workout
    updatedWorkout.id = workout.id;
    updatedWorkout.date = workout.date;

    console.log(updatedWorkout);
    // Add new object to workout array
    this.#workouts.push(updatedWorkout);
    console.log(this.#workouts);
    // Render workout on map as marker
    this._renderWorkoutMarker(updatedWorkout);

    // Remove the old marker from the map
    if (this.#markers[workout.id]) {
      this.#markers[workout.id].remove();
      delete this.#markers[workout.id];
      // remove the description from the map
      //this.#map.removeLayer(workoutEl); // BUG: this does not work, check why the marker is not removed
    }
    // Render the updated workout on the map and in the list
    this._renderWorkoutMarker(updatedWorkout);
    document.querySelector(`.workout[data-id="${workout.id}"]`).remove();
    this._renderWorkout(updatedWorkout);

    // Hide form + clear input fields
    this._hideForm();

    // Remove the old workout from the array
    // this._deleteWorkout(workout.id);
    //set local storage to save data
    this._setLocalStorage(); // most likely needed for later
  }
  _cancel() {
    this._getLocalStorage();
    this._hideForm();
    formButtons.forEach(btn => (btn.style.display = 'none')); // Hide the buttons
    location.reload();
  }

  _deleteWorkout(workoutId) {
    const userConfirmed = confirm(
      'Are you sure you want to delete this workout?'
    );
    if (!userConfirmed) return;
    if (userConfirmed) {
      if (!workoutId) return;

      // find the workout in the array
      const workout = this.#workouts.find(work => work.id === workoutId);

      // BUG:Active workout to delete ONLY the last workout clicked
      // workoutId = this.#activeWorkoutId;
      // select the element of the workout
      const workoutEl = document.querySelector(
        `.workout[data-id="${workoutId}"]`
      );
      // access the coordinates
      const coords = workout.coords;
      // hide chosen marker

      // remove the workout from the array

      // hide the workout element
      if (!workout) return; // Guard clause
      this.#workouts.splice(this.#workouts.indexOf(workout), 1);
      workoutEl.style.display = 'none';
      this.#map.setView(coords, this.#mapZoomLevel, {
        animate: true,
        pan: {
          duration: 1,
        },
      });
      if (this.#markers[workout.id]) {
        this.#markers[workout.id].remove();
        delete this.#markers[workout.id];
      }

      //set local storage to save data
      this._setLocalStorage();
      location.reload();
    }
  }
  _deleteAll() {
    // BUG: This does not work properly, check why
    const userConfirmed = confirm(
      'Are you sure you want to delete all workouts?'
    );
    if (!userConfirmed) return;
    if (userConfirmed) {
      // remove all workouts from the array
      this.#workouts = [];
      // remove all workouts from the UI
      containerWorkouts.innerHTML = '';
      // remove all markers from the map
      // this.#map.removeLayer(workoutEl);
      //set local storage to save data
      this._setLocalStorage();
      this.reset();
      this._clearMapMarkers();
      localStorage.removeItem('workouts');
      localStorage.removeItem('path');
      localStorage.clear();
    }
  }
  _sortWorkouts() {
    // show the buttons
    srtButtons.forEach(btn => (btn.style.display = 'flex'));
    // Event listeners for the sort buttons
    const distanceBtn = document.querySelector('.distance-btn');
    const durationBtn = document.querySelector('.duration-btn');
    // if (this.#workouts.workout.type === 'running') { // cadence/pace for later }
    const cadenceBtn = document.querySelector('.cadence-btn');
    const elevationBtn = document.querySelector('.elevation-btn');

    distanceBtn.addEventListener('click', this._sortDistance.bind(this));
    durationBtn.addEventListener('click', this._sortDuration.bind(this));
    cadenceBtn.addEventListener('click', this._sortCadence.bind(this));
    elevationBtn.addEventListener('click', this._sortElevation.bind(this));
  }
  _sortDistance() {
    // Add toggle functionality on the sort button to sort in ascending and descending order
    this.#sortAscending = !this.#sortAscending;

    this.#workouts.sort((a, b) =>
      this.#sortAscending ? a.distance - b.distance : b.distance - a.distance
    );

    this._clearWorkouts();
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
    this._setLocalStorage();
  }
  _sortDuration() {
    // Add toggle functionality on the sort button to sort in ascending and descending order
    this.#sortAscending = !this.#sortAscending;

    this.#workouts.sort((a, b) =>
      this.#sortAscending ? a.duration - b.duration : b.duration - a.duration
    );

    this._clearWorkouts();
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
    this._setLocalStorage();
  }
  _sortCadence() {
    // Sort the workouts by cadence
    this.#workouts.sort((a, b) => a.type.localeCompare(b.type));

    this.#sortAscending = !this.#sortAscending;

    this.#workouts.sort((a, b) =>
      this.#sortAscending ? a.cadence - b.cadence : b.cadence - a.cadence
    );

    this._clearWorkouts();
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
    this._setLocalStorage();
  }
  _sortElevation() {
    // Sort the workouts by cadence
    this.#workouts.sort((a, b) => b.type.localeCompare(a.type));

    this.#sortAscending = !this.#sortAscending;

    this.#workouts.sort((a, b) =>
      this.#sortAscending
        ? a.elevationGain - b.elevationGain
        : b.elevationGain - a.elevationGain
    );

    this._clearWorkouts();
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
    this._setLocalStorage();
  }
  _clearWorkouts() {
    document.querySelectorAll('.workout').forEach(el => el.remove());
  }
  _renderPathLines(workoutId) {
    // TODO: Fix small bugs

    let polyline = null;

    const workout = this.#workouts.find(work => work.id === workoutId);

    // Retrieve the pathLines from local storage
    // prettier-ignore
    workout.pathLines = JSON.parse(localStorage.getItem(`path-${workoutId}`)) || [];
    // Guard clause: If the pathLines already include the workout's coords, don't add them again
    if (!workout.pathLines.includes(workout.coords)) {
      workout.pathLines.unshift(workout.coords);
    }

    // Create a new polyline for each pathLine and add it to the map
    polyline = L.polyline(workout.pathLines, {
      color: 'red',
      opacity: 1, // Line opacity (0 to 1)
      weight: 5, // Line weight (thickness)
      smoothFactor: 0.5, // Line smoothness (0 to 1)
    }).addTo(this.#map);

    const redIcon = new L.Icon({
      iconUrl:
        'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
    const lastPoint = workout.pathLines.slice(-1)[0];

    const marker = L.marker(lastPoint, { icon: redIcon }).addTo(this.#map);
    if (marker) {
      return;
    }
  }
  _savePath(workoutId) {
    // find the workout in the array
    const workout = this.#workouts.find(work => work.id === workoutId);
    // replace Draw Lines button with Save button
    drawLines.style.display = 'none';

    // show save button
    saveButton.classList.remove('form__row--hidden');

    // Add event listener to the save button
    saveButton.addEventListener('click', () => {
      // Save the path into the locale storage
      // prettier-ignore
      localStorage.setItem(`path-${workoutId}`,JSON.stringify(workout.pathLines)
      );
      // Hide the save button
      saveButton.classList.add('form__row--hidden');
      // Show the Draw Lines button
      drawLines.style.display = 'flex';
      location.reload();
    });
  }
  _drawWorkoutsLines(workoutId) {
    let polyline = null;
    let marker = null;

    // find the workout in the array
    const workout = this.#workouts.find(work => work.id === workoutId);

    // Reset the pathLines array of the workout
    workout.pathLines = [];

    // check if first marker has been rendered
    if (!workout) {
      console.error('Workout not found.');
      return;
    }

    this.#map.off('click'); // Remove previous click event listener
    // Add the coordinates by clicking on the map and store them in the workout object
    this.#map.on('click', e => {
      // Only update the active workout
      if (workout.id !== this.#activeWorkoutId) return;
      // Hide the form
      this._hideForm();

      // Get the latitude and longitude of the clicked point

      const { lat, lng } = e.latlng;
      workout.pathLines.push([lat, lng]);
      console.log(workout.pathLines);

      if (polyline) {
        // Get the last point from the polyline
        const lastPoint = polyline.getLatLngs().slice(-1)[0];

        // Create a new line from the last point to the new point
        const newLine = L.polyline([lastPoint, [lat, lng]], {
          color: 'red', // Line color
          opacity: 1, // Line opacity (0 to 1)
          weight: 5, // Line weight (thickness)
          smoothFactor: 0.5, // Line smoothness (0 to 1)
        }).addTo(this.#map);

        // Update the polyline with the new line
        polyline.addLatLng([lat, lng]);

        // Remove the old marker if it exists
        if (marker) {
          this.#map.removeLayer(marker);
        }

        const redIcon = new L.Icon({
          iconUrl:
            'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });

        marker = L.marker([lat, lng], { icon: redIcon }).addTo(this.#map);
      } else {
        const lastPoint = workout.coords ? workout.coords : [lat, lng];

        // Create a new polyline with the first point
        polyline = L.polyline([lastPoint, [lat, lng]], {
          color: 'red', // Line color
          weight: 5, // Line weight (thickness)
          opacity: 1, // Line opacity (0 to 1)
          smoothFactor: 0.5, // Line smoothness (0 to 1)
        }).addTo(this.#map);
      }

      this._savePath(workoutId);

      // console.log('Initial workout coordinates:', workout.coords);
    });
    // Set the active workout id
    this.#activeWorkoutId = workoutId;
  }
}
const app = new App();
