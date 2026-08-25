package com.testflow.web.security;

/** JWT'den çözülen kimlik — controller'lara request attribute olarak taşınır. */
public record AuthenticatedUser(String username, String displayName, String workspaceId, String workspaceName) {}
