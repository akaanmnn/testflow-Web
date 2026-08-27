package com.testflow.web.controller;

import com.testflow.web.dto.CommonDtos.SaveTestDataSetRequest;
import com.testflow.web.dto.CommonDtos.TestDataSetDto;
import com.testflow.web.entity.TestDataSet;
import com.testflow.web.repository.TestDataSetRepository;
import com.testflow.web.security.AuthenticatedUser;
import com.testflow.web.service.WorkspaceService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/test-data-sets")
public class TestDataSetController {

    private final TestDataSetRepository dataSets;
    private final WorkspaceService workspaceService;

    public TestDataSetController(TestDataSetRepository dataSets, WorkspaceService workspaceService) {
        this.dataSets = dataSets;
        this.workspaceService = workspaceService;
    }

    public record CopyRequest(String targetProjectId) {}

    @PostMapping("/{id}/copy")
    @ResponseStatus(HttpStatus.CREATED)
    public TestDataSetDto copy(@PathVariable String id,
                               @RequestBody CopyRequest body,
                               HttpServletRequest req) {
        AuthenticatedUser user = CurrentUser.from(req);
        TestDataSet src = find(id, user);
        workspaceService.assertMember(body.targetProjectId(), user.username());
        TestDataSet dst = new TestDataSet();
        dst.setName(src.getName());
        dst.setEntries(src.getEntries());
        dst.setWorkspaceId(body.targetProjectId());
        return toDto(dataSets.save(dst));
    }

    @GetMapping
    public List<TestDataSetDto> list(HttpServletRequest req) {
        AuthenticatedUser user = CurrentUser.from(req);
        return dataSets.findByWorkspaceIdOrderByNameAsc(user.workspaceId()).stream()
                .map(this::toDto).toList();
    }

    @GetMapping("/{id}")
    public TestDataSetDto get(@PathVariable String id, HttpServletRequest req) {
        return toDto(find(id, CurrentUser.from(req)));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TestDataSetDto create(@Valid @RequestBody SaveTestDataSetRequest body, HttpServletRequest req) {
        AuthenticatedUser user = CurrentUser.from(req);
        TestDataSet set = new TestDataSet();
        set.setName(body.name());
        set.setEntries(body.entries());
        set.setWorkspaceId(user.workspaceId());
        return toDto(dataSets.save(set));
    }

    @PatchMapping("/{id}")
    public TestDataSetDto update(@PathVariable String id,
                                 @Valid @RequestBody SaveTestDataSetRequest body,
                                 HttpServletRequest req) {
        TestDataSet set = find(id, CurrentUser.from(req));
        set.setName(body.name());
        set.setEntries(body.entries());
        return toDto(dataSets.save(set));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id, HttpServletRequest req) {
        dataSets.delete(find(id, CurrentUser.from(req)));
    }

    private TestDataSet find(String id, AuthenticatedUser user) {
        return dataSets.findByIdAndWorkspaceId(id, user.workspaceId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Test verisi bulunamadı."));
    }

    private TestDataSetDto toDto(TestDataSet s) {
        return new TestDataSetDto(s.getId(), s.getName(), s.getEntries(), s.getCreatedAt(), s.getUpdatedAt());
    }
}
