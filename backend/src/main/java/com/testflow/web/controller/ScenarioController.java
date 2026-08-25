package com.testflow.web.controller;

import com.testflow.web.dto.ScenarioDtos.*;
import com.testflow.web.entity.Scenario;
import com.testflow.web.entity.Step;
import com.testflow.web.repository.ScenarioRepository;
import com.testflow.web.security.AuthenticatedUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/scenarios")
public class ScenarioController {

    private final ScenarioRepository scenarios;

    public ScenarioController(ScenarioRepository scenarios) {
        this.scenarios = scenarios;
    }

    @GetMapping
    public List<ScenarioSummary> list(HttpServletRequest req) {
        AuthenticatedUser user = CurrentUser.from(req);
        return scenarios.findByWorkspaceIdOrderByUpdatedAtDesc(user.workspaceId()).stream()
                .map(s -> new ScenarioSummary(
                        s.getId(), s.getName(), s.getStartUrl(), s.getFolderId(),
                        s.getTags(), s.getSteps().size(), s.getCreatedAt(), s.getUpdatedAt()))
                .toList();
    }

    @GetMapping("/{id}")
    public ScenarioDetail get(@PathVariable String id, HttpServletRequest req) {
        AuthenticatedUser user = CurrentUser.from(req);
        Scenario s = find(id, user);
        return toDetail(s);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public ScenarioDetail create(@Valid @RequestBody CreateScenarioRequest body, HttpServletRequest req) {
        AuthenticatedUser user = CurrentUser.from(req);
        Scenario s = new Scenario();
        s.setName(body.name());
        s.setStartUrl(body.startUrl());
        s.setFolderId(body.folderId());
        s.setTags(body.tags());
        s.setWorkspaceId(user.workspaceId());
        applySteps(s, body.steps());
        return toDetail(scenarios.save(s));
    }

    @PatchMapping("/{id}")
    @Transactional
    public ScenarioDetail update(@PathVariable String id,
                                 @RequestBody UpdateScenarioRequest body,
                                 HttpServletRequest req) {
        AuthenticatedUser user = CurrentUser.from(req);
        Scenario s = find(id, user);
        if (body.name() != null) s.setName(body.name());
        if (body.startUrl() != null) s.setStartUrl(body.startUrl());
        if (body.folderId() != null) s.setFolderId(body.folderId());
        if (body.tags() != null) s.setTags(body.tags());
        if (body.steps() != null) applySteps(s, body.steps());
        return toDetail(scenarios.save(s));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable String id, HttpServletRequest req) {
        AuthenticatedUser user = CurrentUser.from(req);
        scenarios.delete(find(id, user));
    }

    private Scenario find(String id, AuthenticatedUser user) {
        return scenarios.findByIdAndWorkspaceId(id, user.workspaceId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Senaryo bulunamadı."));
    }

    private void applySteps(Scenario s, List<StepDto> stepDtos) {
        s.getSteps().clear();
        if (stepDtos == null) return;
        for (StepDto dto : stepDtos) {
            Step step = new Step();
            step.setScenario(s);
            step.setOrderIndex(dto.orderIndex());
            step.setAction(dto.action());
            step.setCandidates(dto.candidates());
            step.setValue(dto.value());
            step.setDataBinding(dto.dataBinding());
            step.setSensitive(dto.sensitive());
            step.setMeta(dto.meta());
            s.getSteps().add(step);
        }
    }

    private ScenarioDetail toDetail(Scenario s) {
        return new ScenarioDetail(
                s.getId(), s.getName(), s.getStartUrl(), s.getFolderId(), s.getTags(),
                s.getSteps().stream().map(st -> new StepDto(
                        st.getId(), st.getOrderIndex(), st.getAction(), st.getCandidates(),
                        st.getValue(), st.getDataBinding(), st.isSensitive(), st.getMeta())).toList(),
                s.getCreatedAt(), s.getUpdatedAt());
    }
}
