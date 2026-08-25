package com.testflow.web.repository;

import com.testflow.web.entity.Run;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RunRepository extends JpaRepository<Run, String> {
    List<Run> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);
    List<Run> findByWorkspaceIdAndScenarioIdOrderByCreatedAtDesc(String workspaceId, String scenarioId);
    Optional<Run> findByIdAndWorkspaceId(String id, String workspaceId);
}
