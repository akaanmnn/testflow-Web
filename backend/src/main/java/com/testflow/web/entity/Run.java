package com.testflow.web.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "runs")
@Getter @Setter @NoArgsConstructor
public class Run {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "scenario_id", nullable = false)
    private String scenarioId;

    @Column(name = "workspace_id", nullable = false)
    private String workspaceId;

    @Column(name = "environment_id")
    private String environmentId;

    @Column(name = "test_data_set_id")
    private String testDataSetId;

    /** queued | running | passed | failed */
    @Column(nullable = false)
    private String status = "queued";

    @Column(nullable = false)
    private String triggeredBy;

    private Instant startedAt;
    private Instant finishedAt;

    @OneToMany(mappedBy = "run", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    private List<RunStepResult> stepResults = new ArrayList<>();

    @Column(updatable = false, nullable = false)
    private Instant createdAt = Instant.now();
}
