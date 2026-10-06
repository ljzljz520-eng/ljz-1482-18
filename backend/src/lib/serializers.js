function userPublic(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName
  };
}

function projectSummary(project, role) {
  return {
    id: project.slug,
    cuid: project.id,
    name: project.name,
    status: project.status,
    currentModule: project.currentModule,
    requiredModule: project.requiredModule,
    schemaVersion: project.schemaVersion,
    role,
    updatedAt: project.updatedAt
  };
}

function projectDetail(project, role, latestVersion = 1) {
  return {
    ...projectSummary(project, role),
    latestVersion,
    requiresMigration: project.status === 'ACTIVE' && project.currentModule !== project.requiredModule
  };
}

function sessionSerializer(session) {
  return {
    id: session.slug,
    projectId: session.project.slug || session.projectId,
    title: session.title,
    step: session.step,
    scriptText: session.scriptText,
    baseVersion: session.baseVersion,
    deleted: Boolean(session.deletedAt),
    updatedAt: session.updatedAt
  };
}

function assetSerializer(asset) {
  return {
    id: asset.slug,
    projectId: asset.project.slug || asset.projectId,
    name: asset.name,
    type: asset.type,
    url: asset.url,
    notes: asset.notes,
    deleted: Boolean(asset.deletedAt),
    updatedAt: asset.updatedAt
  };
}

function versionSerializer(version) {
  return {
    id: version.id,
    sessionId: version.session.slug || version.sessionId,
    version: version.version,
    content: version.content,
    author: version.author ? userPublic(version.author) : undefined,
    createdAt: version.createdAt
  };
}

function exportSerializer(snapshot) {
  return {
    id: snapshot.slug,
    projectId: snapshot.project.slug || snapshot.projectId,
    sessionId: snapshot.session?.slug ?? snapshot.sessionId,
    label: snapshot.label,
    scriptText: snapshot.scriptText,
    scriptVersion: snapshot.scriptVersion,
    step: snapshot.step,
    createdAt: snapshot.createdAt,
    immutable: true
  };
}

module.exports = {
  userPublic,
  projectSummary,
  projectDetail,
  sessionSerializer,
  assetSerializer,
  versionSerializer,
  exportSerializer
};
