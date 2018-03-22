const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const bunyan = require('bunyan');
const minimist = require('minimist');
const ncp = require('ncp').ncp;
const Namespaces = require('./components/namespaces');
const Elements = require('./components/Elements');

var rootLogger = bunyan.createLogger({name: 'shr-json-javadoc'});
var logger = rootLogger;
function setLogger(bunyanLogger) {
  rootLogger = logger = bunyanLogger;
}

function compileJavadoc(cimcore, outPath) {
  // Run main code
  return new SHR(cimcore, outPath);
}

function exportToPath(compiledSHR, outPath) {
  // export HTML
  compiledSHR.outDirectory = outPath;
  compiledSHR.generateHTML()
}


// Function to generate and write html from an ejs template
renderEjsFile = (template, pkg, destination) => {
  ejs.renderFile(template, pkg, (error, htmlText) => {
    if (error) console.log(error);
    else fs.writeFileSync(destination, htmlText);
  });
}

/*
 *  SHR class holds the canonical json in memory.
 *  Uses Namespaces and Elements classes to hold the data.
 */
class SHR {
  constructor(cimcore, out) {
    this.outDirectory = out;
    this.elements = new Elements();
    this.namespaces = new Namespaces();
    this.children = {};
    this.readFiles(cimcore);
    this.elements.flatten();
  }

  set metaData(metaData) { this._metaData = metaData}
  get metaData() { return this._metaData }

  // Read in the canonical json files
  // Assumes first level of directories are namespaces
  readFiles(cimcore) {
    logger.info('Compiling Documentation for %s namespaces...', Object.keys(cimcore.namespaces).length);
    this.metaData = cimcore.projectInfo;
    for (const ns in cimcore.namespaces) {
      const namespace = this.namespaces.get(ns);
      namespace.description = cimcore.namespaces[ns].description;
    }

    for (const de of cimcore.dataElements) {
      this.elements.add(de);
      const element = this.elements.get(de.fqn);
      const namespace = this.namespaces.get(element.namespace);
      namespace.addElement(element);
      element.namespacePath = namespace.path;
    }
  }

  // Builds the output directory folder structure
  buildOutputDirectory() {
    if (!fs.existsSync(this.outDirectory))
      fs.mkdirSync(this.outDirectory);

    for (const namespace of this.namespaces.list()) {
      const dir = path.join(this.outDirectory, namespace.path);
      if (!fs.existsSync(dir))
        fs.mkdirSync(dir);
    };
  }

  // Copy the required files to output directory
  // This includes images, index.html, and the stylesheet
  copyRequiredFiles() {
    ncp('required', this.outDirectory, (error) => {
      if (error) return console.log(error);
    });
  }

  // Builds the package files that contain lists of the elements for
  // a given namespace
  buildPackageFiles() {
    for (const namespace of this.namespaces.list()) {
      const fileName = `${namespace.path}-pkg.html`;
      const filePath = path.join(this.outDirectory, namespace.path, fileName);
      const ejsPkg = { elements: namespace.elements, namespace: namespace, metaData: this.metaData };
      renderEjsFile('templates/pkg.ejs', ejsPkg, filePath);
    };
  }

  // Builds the info files that describe each namespace
  buildInfoFiles() {
    for (const namespace of this.namespaces.list()) {
      const fileName = `${namespace.path}-info.html`;
      const filePath = path.join(this.outDirectory, namespace.path, fileName);
      const ejsPkg = { namespace: namespace, metaData: this.metaData  };
      renderEjsFile('templates/info.ejs', ejsPkg, filePath);
    };
  }

  // Builds the overview list which displays all the namespaces
  buildOverviewFrame() {
    const ejsPkg = { namespaces: this.namespaces.list(), metaData: this.metaData  };
    const filePath = path.join(this.outDirectory, 'overview-frame.html');
    renderEjsFile('templates/overview-frame.ejs', ejsPkg, filePath);
  }

  // Builds overiew list of all the data elements on the main page
  buildOverviewSummary() {
    const ejsPkg = { elements: this.elements.list(), metaData: this.metaData  };
    const filePath = path.join(this.outDirectory, 'overview-summary.html');
    renderEjsFile('templates/overview-summary.ejs', ejsPkg, filePath);
  }

  // Builds list of all the data elements on the main page
  buildAllElementsFrame() {
    const ejsPkg = { elements: this.elements.list().filter(de=>de.hierarchy.length > 0), metaData: this.metaData  };
    const filePath = path.join(this.outDirectory, 'allclasses-frame.html');
    renderEjsFile('templates/allclasses-frame.ejs', ejsPkg, filePath);
  }

  // Builds pages for each data element
  buildDataElements() {
    console.log('Building documentation pages for %s elements...', this.elements.list().length);
    for (const element of this.elements.list()) {
      const ejsPkg = { element: element, metaData: this.metaData  };
      const fileName = `${element.name}.html`;
      const filePath = path.join(this.outDirectory, element.namespacePath, fileName);
      renderEjsFile('templates/dataElement.ejs', ejsPkg, filePath);
    };
  }

  // Runs all the different components to generate the html files
  generateHTML() {
    this.buildOutputDirectory();
    this.copyRequiredFiles();
    this.buildPackageFiles();
    this.buildInfoFiles();
    this.buildOverviewFrame();
    this.buildOverviewSummary();
    this.buildAllElementsFrame();
    this.buildDataElements();
  }
}

module.exports = {setLogger, compileJavadoc, exportToPath}