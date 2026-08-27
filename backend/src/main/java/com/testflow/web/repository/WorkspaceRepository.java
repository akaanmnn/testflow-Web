package com.testflow.web.repository;

import com.testflow.web.entity.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WorkspaceRepository extends JpaRepository<Workspace, String> {
    Optional<Workspace> findByOwnerUsernameAndPersonalTrue(String ownerUsername);
}
