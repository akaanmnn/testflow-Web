package com.testflow.web.repository;

import com.testflow.web.entity.TestDataSet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TestDataSetRepository extends JpaRepository<TestDataSet, String> {
    List<TestDataSet> findByWorkspaceIdOrderByNameAsc(String workspaceId);
    Optional<TestDataSet> findByIdAndWorkspaceId(String id, String workspaceId);
}
