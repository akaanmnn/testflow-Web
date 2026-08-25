package com.testflow.web.dto;

import jakarta.validation.constraints.NotBlank;

public class AuthDtos {
    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}
    public record LoginResponse(String accessToken, UserInfo user) {}
    public record UserInfo(String username, String displayName, String workspaceId, String workspaceName) {}
}
