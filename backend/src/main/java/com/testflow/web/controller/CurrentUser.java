package com.testflow.web.controller;

import com.testflow.web.security.AuthenticatedUser;
import com.testflow.web.security.JwtAuthFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Request'ten doğrulanmış kullanıcıyı çeker. */
public final class CurrentUser {
    private CurrentUser() {}

    public static AuthenticatedUser from(HttpServletRequest request) {
        Object user = request.getAttribute(JwtAuthFilter.USER_ATTR);
        if (user instanceof AuthenticatedUser au) return au;
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Oturum bulunamadı.");
    }
}
