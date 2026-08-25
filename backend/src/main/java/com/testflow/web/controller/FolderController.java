package com.testflow.web.controller;

import com.testflow.web.dto.CommonDtos.CreateFolderRequest;
import com.testflow.web.dto.CommonDtos.FolderDto;
import com.testflow.web.entity.Folder;
import com.testflow.web.repository.FolderRepository;
import com.testflow.web.security.AuthenticatedUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/folders")
public class FolderController {

    private final FolderRepository folders;

    public FolderController(FolderRepository folders) {
        this.folders = folders;
    }

    @GetMapping
    public List<FolderDto> list(HttpServletRequest req) {
        AuthenticatedUser user = CurrentUser.from(req);
        return folders.findByWorkspaceIdOrderByNameAsc(user.workspaceId()).stream()
                .map(f -> new FolderDto(f.getId(), f.getName(), f.getCreatedAt()))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FolderDto create(@Valid @RequestBody CreateFolderRequest body, HttpServletRequest req) {
        AuthenticatedUser user = CurrentUser.from(req);
        Folder f = new Folder();
        f.setName(body.name());
        f.setWorkspaceId(user.workspaceId());
        f = folders.save(f);
        return new FolderDto(f.getId(), f.getName(), f.getCreatedAt());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id, HttpServletRequest req) {
        AuthenticatedUser user = CurrentUser.from(req);
        Folder f = folders.findByIdAndWorkspaceId(id, user.workspaceId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Klasör bulunamadı."));
        folders.delete(f);
    }
}
