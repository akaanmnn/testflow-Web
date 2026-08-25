package com.testflow.web.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "test_data_sets")
@Getter @Setter @NoArgsConstructor
public class TestDataSet {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(name = "workspace_id", nullable = false)
    private String workspaceId;

    /**
     * Girdiler — JSON string:
     * [{"key":"kullanici_email","type":"text","value":"qa@sirket.com","sensitive":false}, ...]
     */
    @Column(columnDefinition = "TEXT", nullable = false)
    private String entries = "[]";

    @Column(updatable = false, nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void touch() { this.updatedAt = Instant.now(); }
}
