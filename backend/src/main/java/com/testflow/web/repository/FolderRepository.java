package com.testflow.web.repository;

import com.testflow.web.entity.Folder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FolderRepository extends JpaRepository<Folder, String> {
    List<Folder> findByWorkspaceIdOrderByNameAsc(String workspaceId);
    Optional<Folder> findByIdAndWorkspaceId(String id, String workspaceId);
}
