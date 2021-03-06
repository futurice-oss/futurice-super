Polymer('x-project-card-grid', {
  previewChunkSize: 4,
  animationDuration: 300, // milliseconds
  created: function() {
    this.projects = [];
    this.sortedProjects = [];
    this.chunks = [];
    this.sortBy = "";
  },
  ready: function() {
    this.currentChunkIndex = 0;
  },
  getPropertyValue: function (object, prop) {
    if (!object.hasOwnProperty(prop)) {
      throw Error("Object does not have property "+prop);
    }

    return object[prop];
  },
  getIteratorValue: function (project, sortBy) {
    var sortKeys = sortBy.split('.'),
      value;

    if (sortKeys.length < 1) {
      throw new Error("No sort keys");
    } else if (sortKeys.length > 3) {
      throw new Error("Too many sort keys");
    }

    // Initially set value as the first key's value
    value = this.getPropertyValue(project, sortKeys[0]);
    // We may need to go deeper.
    for (var i = 1; i < sortKeys.length; i++) {
      value = this.getPropertyValue(value, sortKeys[i]);
    }

    // When value is a string, return it lowercased for proper
    // alphabetical ordering.
    return typeof value === "string" ? value.toLowerCase() : value;
  },
  sortByChanged: function() {
    this.projectsChanged();
  },
  projectsChanged: function() {
    var self = this;

    // Set up ordering
    if (self.projects.length > 0 && self.sortBy) {
      var sortBy = self.sortBy,
        reversed = false;

      // sortBy values starting with dash (minus) will cause
      // the list to be reversed
      if (sortBy.indexOf('-') === 0) {
        reversed = true;
        sortBy = sortBy.substring(1);
      }
      try {
        self.sortedProjects = _.sortBy(self.projects, function (project) {
          // null values are no good for Array.prototype.sort()
          if (self.getIteratorValue(project, sortBy) === null) {
            return undefined;
          }
          return self.getIteratorValue(project, sortBy);
        });
      } catch(err) {
        console.log("Something went wrong while sorting.", err);
      }

      if (reversed) {
        self.sortedProjects.reverse();
      }
    } else {
      self.sortedProjects = self.projects;
    }

    self.displayChunks();
  },
  displayChunks: function() {
    var self = this;

    self.chunks = [self.sortedProjects.slice(0, self.previewChunkSize), []];
    if (self.sortedProjects.length > self.previewChunkSize) {
      setTimeout(function() {
        self.chunks[1] = self.sortedProjects.slice(self.previewChunkSize);
      }, self.animationDuration);
    }
  }
});