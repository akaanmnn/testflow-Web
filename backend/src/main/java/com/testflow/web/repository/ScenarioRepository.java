package com.testflow.web.repository;

import com.testflow.web.entity.Scenario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ScenarioRepository extends JpaRepository<Scenario, String> {
    List<Scenario> findByWorkspaceIdOrderByUpdatedAtDesc(String workspaceId);
    Optional<Scenario> findByIdAndWorkspaceId(String id, String workspaceId);
}
