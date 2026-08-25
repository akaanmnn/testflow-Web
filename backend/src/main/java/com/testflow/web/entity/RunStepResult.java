package com.testflow.web.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "run_step_results")
@Getter @Setter @NoArgsConstructor
public class RunStepResult {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "run_id", nullable = false)
    private Run run;

    @Column(name = "step_id")
    private String stepId;

    @Column(nullable = false)
    private int orderIndex;

    /** passed | failed | skipped */
    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private boolean healed = false;

    private String healedStrategy;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;
}
