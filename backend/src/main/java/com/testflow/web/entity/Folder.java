package com.testflow.web.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "folders")
@Getter @Setter @NoArgsConstructor
public class Folder {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(name = "workspace_id", nullable = false)
    private String workspaceId;

    @Column(updatable = false, nullable = false)
    private Instant createdAt = Instant.now();
}
