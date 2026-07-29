const path = require('path');
const fs = require('fs');

function mergeSwaggerFiles() {
  const swaggerBase = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../swagger/swagger.json'), 'utf8')
  );

  const pathsDir = path.join(__dirname, '../swagger/paths');
  const schemasDir = path.join(__dirname, '../swagger/schemas');

  // Merge paths
  if (fs.existsSync(pathsDir)) {
    const pathFiles = fs.readdirSync(pathsDir).filter((f) => f.endsWith('.json'));
    for (const file of pathFiles) {
      const data = JSON.parse(fs.readFileSync(path.join(pathsDir, file), 'utf8'));
      swaggerBase.paths = { ...swaggerBase.paths, ...data };
    }
  }

  // Merge schemas
  if (fs.existsSync(schemasDir)) {
    const schemaFiles = fs.readdirSync(schemasDir).filter((f) => f.endsWith('.json'));
    for (const file of schemaFiles) {
      const data = JSON.parse(fs.readFileSync(path.join(schemasDir, file), 'utf8'));
      if (!swaggerBase.components) swaggerBase.components = {};
      if (!swaggerBase.components.schemas) swaggerBase.components.schemas = {};
      swaggerBase.components.schemas = { ...swaggerBase.components.schemas, ...data };
    }
  }

  return swaggerBase;
}

module.exports = { mergeSwaggerFiles };
