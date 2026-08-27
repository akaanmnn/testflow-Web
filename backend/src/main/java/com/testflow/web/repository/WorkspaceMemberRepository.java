package com.testflow.web.repository;

import com.testflow.web.entity.WorkspaceMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, String> {
    List<WorkspaceMember> findByUsername(String username);
    List<WorkspaceMember> findByWorkspaceIdOrderByCreatedAtAsc(String workspaceId);
    Optional<WorkspaceMember> findByWorkspaceIdAndUsername(String workspaceId, String username);
    boolean existsByWorkspaceIdAndUsername(String workspaceId, String username);
}
