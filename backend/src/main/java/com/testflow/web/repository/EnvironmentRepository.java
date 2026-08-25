package com.testflow.web.repository;

import com.testflow.web.entity.Environment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EnvironmentRepository extends JpaRepository<Environment, String> {
    List<Environment> findByWorkspaceIdOrderByNameAsc(String workspaceId);
    Optional<Environment> findByIdAndWorkspaceId(String id, String workspaceId);
}
