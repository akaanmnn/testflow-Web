package com.testflow.web.controller;

import com.testflow.web.dto.AuthDtos.LoginRequest;
import com.testflow.web.dto.AuthDtos.LoginResponse;
import com.testflow.web.dto.AuthDtos.UserInfo;
import com.testflow.web.entity.Workspace;
import com.testflow.web.security.JwtService;
import com.testflow.web.service.LdapAuthService;
import com.testflow.web.service.WorkspaceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final LdapAuthService ldapAuth;
    private final WorkspaceService workspaceService;
    private final JwtService jwtService;

    public AuthController(LdapAuthService ldapAuth, WorkspaceService workspaceService, JwtService jwtService) {
        this.ldapAuth = ldapAuth;
        this.workspaceService = workspaceService;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req) {
        LdapAuthService.LdapUser user;
        try {
            user = ldapAuth.authenticate(req.username(), req.password());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Kullanıcı adı veya şifre hatalı.");
        }

        String group = ldapAuth.findUserGroup(req.username());
        if (group == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Hesabınız herhangi bir TestFlow grubuna atanmamış. IT ile iletişime geçin.");
        }

        Workspace ws = workspaceService.resolveByLdapGroup(group);
        String token = jwtService.generate(user.username(), user.displayName(), ws.getId(), ws.getName());
        return new LoginResponse(token,
                new UserInfo(user.username(), user.displayName(), ws.getId(), ws.getName()));
    }
}
